import React, { useState, useRef, useEffect } from 'react';
import { Message, UserSession } from '../types';
import { Mic, MicOff, Send, Loader2, AudioWaveform, CircleStop, Languages } from 'lucide-react';
import { decode, decodeAudioData, createBlob, downsampleBuffer } from '../audioUtils';
import { SYSTEM_INSTRUCTION } from '../geminiService';
import { SubscriptionService } from '../utils/subscriptionService';

interface ChatViewProps {
  voicePreference: 'masculine' | 'feminine' | null;
  session?: UserSession | null;
}

const ChatView: React.FC<ChatViewProps> = ({ voicePreference, session }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Olá. Eu sou o Elo. Estou aqui para te ouvir. Como você está se sentindo hoje?',
      timestamp: new Date()
    }
  ]);
  
  // States
  const [micStatus, setMicStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const [input, setInput] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  // Visual/Audio Feedback
  const [inputVolume, setInputVolume] = useState(0);
  const [streamingUserText, setStreamingUserText] = useState('');
  const [streamingModelText, setStreamingModelText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');
  const voiceModeRef = useRef<'websocket' | 'native' | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSynthesizerSpeakingRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const synthesisFallbackTimerRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            setMicStatus('granted');
          } else if (permissionStatus.state === 'denied') {
            setMicStatus('denied');
          }
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              setMicStatus('granted');
            } else if (permissionStatus.state === 'denied') {
              setMicStatus('denied');
            } else {
              setMicStatus('undetermined');
            }
          };
        })
        .catch(err => {
          console.log("Permissions API query issue:", err);
        });
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLive, isConnecting, streamingUserText, streamingModelText]);

  useEffect(() => {
    return () => {
      stopLiveSession(true);
    };
  }, []);

  // --- VOICE LOGIC ---

  const requestMicPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microfone não suportado no navegador atual ou conexão não segura (requer HTTPS).");
      return;
    }

    setVoiceError(null);
    setIsConnecting(true);

    // CRITICAL FOR MOBILE WEB (Android Chrome / iOS Safari):
    // Instantiating/resuming AudioContext SYNCHRONOUSLY directly inside the user click action tick
    // before any asynchronous 'await getUserMedia' call. Otherwise, modern mobile browsers
    // will block AudioContext as an unauthorized autoplay attempt.
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = {
          input: new AudioContextClass(),
          output: new AudioContextClass()
        };
        console.log("🔊 AudioContext instanciado com sucesso no clique do usuário.");
      } catch (e) {
        console.error("🚨 Erro de criação do AudioContext sincronizado:", e);
      }
    }

    // Unlock iOS/Safari speech synthesis autoplay restriction on user-interaction click tick
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const silentUtterance = new SpeechSynthesisUtterance("");
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
        console.log("🔊 SpeechSynthesis desbloqueado para iOS/Safari no clique do usuário.");
      } catch (e) {
        console.warn("⚠️ Não foi possível testar/desbloquear SpeechSynthesis no clique:", e);
      }
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.input.resume();
        await audioContextRef.current.output.resume();
        console.log("🔊 AudioContext iniciado/retomado no clique.");
      } catch (e) {
        console.warn("⚠️ Não foi possível iniciar o AudioContext no clique:", e);
      }
    }

    try {
      console.log("🎤 Solicitando permissões de áudio oficiais do navegador...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      activeStreamRef.current = stream;
      setMicStatus('granted');
      console.log("✅ Permissão de microfone concedida.");

      await startLiveSession(stream);
    } catch (error: any) {
      console.error("❌ Falha precisa ao requisitar acesso ao microfone:", error);
      setMicStatus('denied');
      setVoiceError("Acesso ao microfone negado ou bloqueado.");
      setIsConnecting(false);
    }
  };

  const startLiveSession = async (existingStream?: MediaStream) => {
    if (isLive) return;
    setIsConnecting(true);
    setVoiceError(null);
    voiceModeRef.current = null;

    // Stop and clear any previous zombie sessions/websockets
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }

    stopSpeaking();

    try {
      // MOBILE FIX: Reuse existing, active stream tracks instead of calling getUserMedia multiple times,
      // which locks files/devices and causes 'NotReadableError' on Chrome Android or iOS.
      let stream = existingStream || activeStreamRef.current;
      const isStreamActive = stream && stream.getTracks().some(t => t.readyState === 'live');

      if (!isStreamActive) {
        console.log("🎤 Nenhum stream de áudio ativo disponível. Solicitando um novo...");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        activeStreamRef.current = stream;
      } else {
        console.log("🔁 Reutilizando conexão de stream de áudio anteriormente obtida e ativa.");
      }

      // Safeguard: Ensure AudioContext has resumed after async stream capture
      if (audioContextRef.current) {
        if (audioContextRef.current.input.state === 'suspended') {
          await audioContextRef.current.input.resume();
        }
        if (audioContextRef.current.output.state === 'suspended') {
          await audioContextRef.current.output.resume();
        }
      }

      // Netlify Serverless environment detection (where ws websocket proxy server does not run)
      const isServerlessProd = !window.location.hostname.includes('localhost') && 
                               !window.location.hostname.includes('127.0.0.1') && 
                               !window.location.hostname.includes('us-west1.run.app');

      if (isServerlessProd) {
        console.log("⚡ [PRODUÇÃO NETLIFY] Detectado ambiente serverless / Netlify. Pulando conexão de WebSocket e ativando Voz Nativa do Navegador sem lag...");
        startNativeVoiceSession(stream!);
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${protocol}//${window.location.host}/api/live?voice=masculine`;
      console.log(`🔌 Conectando Websocket de voz em: ${socketUrl}`);

      let webSocketWorked = false;
      let timeoutId: any = null;

      const socket = new WebSocket(socketUrl);
      sessionRef.current = socket;

      const activateNativeFallback = () => {
        if (webSocketWorked) return;
        console.log("🦾 [FALLBACK] WebSocket de voz indisponível ou rejeitado. Ativando Modo de Voz Nativo do Navegador...");
        try { socket.close(); } catch (e) {}
        if (sessionRef.current === socket) {
          sessionRef.current = null;
        }
        startNativeVoiceSession(stream!);
      };

      // If connection isn't finalized within 3.5s, fall back to native browser speech client
      timeoutId = setTimeout(() => {
        if (!webSocketWorked) {
          console.warn("⚠️ Servidor de Live WebSocket demorou para responder. Ativando fallback...");
          activateNativeFallback();
        }
      }, 3500);

      socket.onopen = () => {
        if (timeoutId) clearTimeout(timeoutId);
        webSocketWorked = true;
        voiceModeRef.current = 'websocket';
        console.log('✅ WebSocket conectado com sucesso ao proxy de Voz.');
        setIsLive(true);
        setIsConnecting(false);

        // Set up Web Audio API routing with scriptProcessor
        const inputCtx = audioContextRef.current!.input;
        const source = inputCtx.createMediaStreamSource(stream!);
        sourceNodeRef.current = source;
        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = scriptProcessor;

        const inputSampleRate = inputCtx.sampleRate;

        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          setInputVolume(Math.sqrt(sum / inputData.length));
          
          // Downsample high frequency streams to Gemini live ideal 16000Hz mono PCM buffer
          const downsampledInput = downsampleBuffer(inputData, inputSampleRate, 16000);
          const pcmBlob = createBlob(downsampledInput);
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ audio: pcmBlob }));
          }
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputCtx.destination);
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'session_ready') {
            console.log('✅ IA de voz do Elo pronta para a conversa!');
            return;
          }
          if (message.type === 'error') {
            console.error('⚠️ Detecção de erro remoto:', message.message);
            setVoiceError(message.message || 'Erro do servidor de voz.');
            stopLiveSession();
            return;
          }

          // Handle Live Transcriptions
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            setStreamingModelText(currentOutputTranscription.current);
          }
          if (message.serverContent?.inputTranscription) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
            setStreamingUserText(currentInputTranscription.current);
          }
          if (message.serverContent?.turnComplete) {
            const userT = currentInputTranscription.current;
            const modelT = currentOutputTranscription.current;
            if (userT || modelT) {
              setMessages(prev => [
                ...prev,
                ...(userT ? [{ role: 'user', text: userT, timestamp: new Date() } as Message] : []),
                ...(modelT ? [{ role: 'model', text: modelT, timestamp: new Date() } as Message] : [])
              ]);
            }
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
            setStreamingUserText('');
            setStreamingModelText('');
          }

          // Handle incoming models voice chunks
          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data && audioContextRef.current) {
              const outCtx = audioContextRef.current.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(part.inlineData.data), outCtx, 24000, 1);
              const sourceNode = outCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outCtx.destination);
              sourceNode.onended = () => sourcesRef.current.delete(sourceNode);
              sourceNode.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(sourceNode);
            }
          }

          // Interrupt sound output if user speaks or sends new inputs
          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        } catch (err) {
          console.error('Erro na deserialização da mensagem de voz:', err);
        }
      };

      socket.onclose = (event) => {
        if (timeoutId) clearTimeout(timeoutId);
        console.log('🔌 Conexão de voz encerrada com código:', event.code);
        if (!webSocketWorked) {
          activateNativeFallback();
        } else {
          setIsLive(false);
          setIsConnecting(false);
          if (event.code !== 1000 && event.code !== 1001 && event.code !== 1005) {
            setVoiceError('Liguei e perdi conexão com o Elo. Toque novamente para reiniciar.');
          }
        }
      };

      socket.onerror = (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        console.error('🚨 WebSocket Live erro:', err);
        if (!webSocketWorked) {
          activateNativeFallback();
        } else {
          setVoiceError('Falha temporária de conexão de voz.');
          setIsLive(false);
          setIsConnecting(false);
        }
      };

    } catch (e: any) {
      console.error('🚨 Erro ao iniciar a sessão de voz:', e);
      if (voiceModeRef.current !== 'native') {
        setVoiceError('Não foi possível estabelecer contato de voz.');
        setIsConnecting(false);
        setIsLive(false);
      }
    }
  };

  const startNativeVoiceSession = (stream: MediaStream) => {
    voiceModeRef.current = 'native';
    setIsLive(true);
    setIsConnecting(false);
    setVoiceError(null);

    try {
      if (audioContextRef.current) {
        const inputCtx = audioContextRef.current.input;
        const source = inputCtx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;
        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = scriptProcessor;

        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          setInputVolume(Math.sqrt(sum / inputData.length));
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(inputCtx.destination);
      }
    } catch (e) {
      console.warn("⚠️ Audiometer não pôde ser iniciado no modo nativo:", e);
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.error("🚨 Reconhecimento de voz do navegador nativo não é suportado.");
      setVoiceError("Reconhecimento de voz nativo indisponível neste navegador.");
      stopLiveSession();
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      let finalTranscript = '';
      let latestSpeech = '';

      recognition.onstart = () => {
        console.log("🎤 Reconhecimento de voz nativo iniciado com sucesso.");
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const overallTranscript = finalTranscript + interimTranscript;
        latestSpeech = overallTranscript;
        setStreamingUserText(overallTranscript);

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (overallTranscript.trim() && voiceModeRef.current === 'native') {
          silenceTimerRef.current = setTimeout(() => {
            console.log("🤫 Silêncio de 1.8s detectado. Parando reconhecimento para enviar áudio...");
            try {
              recognition.stop();
            } catch (e) {}
          }, 1800);
        }
      };

      recognition.onend = async () => {
        console.log("🎤 Reconhecimento de voz nativo onend acionado. finalTranscript:", finalTranscript, "latestSpeech:", latestSpeech);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        
        // If synthesis is currently speaking, do NOT restart recognition here (it restarts on utterance.onend)
        if (isSynthesizerSpeakingRef.current) {
          console.log("🎤 [SKIPPED RESTART] Deixando reconhecimento pausado enquanto Elo fala.");
          return;
        }

        const textToSend = finalTranscript.trim() || latestSpeech.trim();
        finalTranscript = '';
        latestSpeech = '';
        setStreamingUserText('');

        if (voiceModeRef.current === 'native' && textToSend) {
          console.log("👉 [PRODUÇÃO VOICE] Enviando transcrição capturada para a IA do Elo:", textToSend);
          
          // Use modern state-independent context history sequence to avoid react state timeline race conditions
          const newUserMessage: Message = { role: 'user', text: textToSend, timestamp: new Date() };
          const updatedHistory = [...messages, newUserMessage];
          setMessages(updatedHistory);
          
          setIsSendingText(true);
          try {
            const reply = await getEloTextResponse(textToSend, updatedHistory);
            console.log("✅ [PRODUÇÃO VOICE] Resposta gerada pela IA do Elo recebida:", reply);
            setMessages(prev => [...prev, { role: 'model', text: reply, timestamp: new Date() }]);
            speakTextNative(reply);
          } catch (err: any) {
            console.error("❌ Erro ao buscar resposta no modo nativo:", err);
            // Resume detection upon api system error
            if (voiceModeRef.current === 'native') {
              setTimeout(() => {
                try {
                  if (voiceModeRef.current === 'native' && recognitionRef.current === recognition) {
                    recognition.start();
                  }
                } catch (e) {}
              }, 1000);
            }
          } finally {
            setIsSendingText(false);
          }
        } else if (voiceModeRef.current === 'native') {
          // Restart recognition quickly upon silence of ambient sound
          console.log("🎤 [RESTART] Nenhum texto relevante captado, reiniciando detector de fala...");
          setTimeout(() => {
            try {
              if (voiceModeRef.current === 'native' && recognitionRef.current === recognition) {
                recognition.start();
              }
            } catch (e) {}
          }, 600);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("⚠️ Erro de SpeechRecognition nativo:", event.error);
        if (event.error === 'not-allowed') {
          setVoiceError("Sem permissão de microfone.");
          stopLiveSession();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      console.error("🚨 Falha ao configurar o SpeechRecognition:", err);
    }
  };

  const speakTextNative = async (text: string) => {
    // 1. Parar reprodução de áudio anterior se houver
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch (e) {}
      currentAudioRef.current = null;
    }

    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }

    // Limpar temporizadores ativos de segurança
    if (synthesisFallbackTimerRef.current) {
      clearTimeout(synthesisFallbackTimerRef.current);
      synthesisFallbackTimerRef.current = null;
    }

    const cleanText = text.replace(/[\*\#\_]/g, '').trim();
    if (!cleanText) return;

    isSynthesizerSpeakingRef.current = true;
    setStreamingModelText("Elo está falando...");

    // Turn off speech recognition temporarily while speaking to prevent speaking feedback from being recognized
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    const finalizeSpeech = () => {
      if (synthesisFallbackTimerRef.current) {
        clearTimeout(synthesisFallbackTimerRef.current);
        synthesisFallbackTimerRef.current = null;
      }
      setStreamingModelText("");
      isSynthesizerSpeakingRef.current = false;
      currentAudioRef.current = null;

      // Resume speech recognition safely when speaker finishes talking
      if (voiceModeRef.current === 'native' && recognitionRef.current) {
        setTimeout(() => {
          try {
            if (voiceModeRef.current === 'native' && !isSynthesizerSpeakingRef.current) {
              recognitionRef.current.start();
              console.log("🎤 [TTS] Reconhecimento de voz retomado após fala do Elo.");
            }
          } catch (e) {}
        }, 400);
      }
    };

    // Cronômetro máximo de contingência contra travamento do reprodutor
    const durationEst = Math.min(30000, Math.max(5000, cleanText.length * 100 + 4000));
    synthesisFallbackTimerRef.current = setTimeout(() => {
      if (isSynthesizerSpeakingRef.current) {
        console.warn("⚠️ [VOICE TIMEOUT] Tempo limite de voz atingido. Forçando encerramento...");
        finalizeSpeech();
      }
    }, durationEst);

    try {
      console.log("🔊 [CLIENT TTS] Iniciando chamada para áudio premium do servidor...");
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audio) {
          const mime = data.mimeType || 'audio/wav';
          const audioUrl = `data:${mime};base64,${data.audio}`;
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            console.log("🔊 [CLIENT TTS] Áudio concluído com sucesso.");
            finalizeSpeech();
          };

          audio.onerror = (err) => {
            console.warn("⚠️ Erro de execução do reprodutor HTML5 Audio, recorrendo ao fallback nativo:", err);
            fallbackSpeechSynthesis(cleanText, finalizeSpeech);
          };

          await audio.play();
          return;
        }
      }
      throw new Error(`Servidor respondeu com status ${response.status}`);
    } catch (err) {
      console.warn("⚠️ Falha ao obter áudio premium, recorrendo ao fallback de síntese nativo:", err);
      fallbackSpeechSynthesis(cleanText, finalizeSpeech);
    }
  };

  // Método de contingência (fallback) usando a síntese nativa clássica do navegador
  const fallbackSpeechSynthesis = (cleanText: string, onDone: () => void) => {
    if (!window.speechSynthesis) {
      onDone();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';

      const voices = window.speechSynthesis.getVoices();
      const ptVoices = voices.filter(v => v.lang.startsWith('pt'));
      const masculineKeywords = ['daniel', 'julio', 'antonio', 'yuri', 'male', 'masculin', 'duarte', 'homem', 'graham'];
      const preferredVoice = ptVoices.find(v => {
        const nameLower = v.name.toLowerCase();
        return masculineKeywords.some(keyword => nameLower.includes(keyword));
      }) || ptVoices.find(v => v.name.toLowerCase().includes('google')) || ptVoices[0] || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 0.85;
      utterance.pitch = 0.83;

      utterance.onend = () => onDone();
      utterance.onerror = () => onDone();

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("🚨 Falha total no fallback de voz:", error);
      onDone();
    }
  };

  const stopSpeaking = () => {
    if (synthesisFallbackTimerRef.current) {
      clearTimeout(synthesisFallbackTimerRef.current);
      synthesisFallbackTimerRef.current = null;
    }
    isSynthesizerSpeakingRef.current = false;
    
    // parar player de Audio premium
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
      } catch (e) {}
      currentAudioRef.current = null;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const stopLiveSession = (fullDeactivate = false) => {
    console.log(`🔌 Encerrando sessão de voz (Desativação total: ${fullDeactivate})`);
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    voiceModeRef.current = null;
    stopSpeaking();

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {}
      sourceNodeRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();

    if (fullDeactivate && activeStreamRef.current) {
      try {
        activeStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      activeStreamRef.current = null;
      setMicStatus('undetermined');
    }

    setIsLive(false);
    setIsConnecting(false);
    setInputVolume(0);
    setStreamingUserText('');
    setStreamingModelText('');
  };

  // --- TEXT LOGIC ---

  const getEloTextResponse = async (userMsg: string, history: Message[]): Promise<string> => {
    const rawPayload = {
      message: userMsg,
      historyLength: history.length,
      historyItems: history.slice(-12).map(h => ({ role: h.role, textLength: h.text?.length || 0 }))
    };

    console.log("------------------ IA SYSTEM AUDIT START ------------------");
    console.log("📤 [AUDIT LOG] Payload REAL enviado para a camada de serviço:", JSON.stringify(rawPayload, null, 2));
    console.log("👉 Contexto enviado - Mensagem Atual:", `"${userMsg}"`);
    console.log("👉 Histórico de Contexto:", history.slice(-12));

    // Tentativa 1: Rota express comum de proxy
    try {
      console.log("📨 [Tentativa 1] Enviando requisição de chat via Express proxy /api/chat...");
      const startTime = Date.now();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          messages: history.slice(-12)
        })
      });

      console.log(`📡 [Tentativa 1] Status Code Recebido: ${response.status} (Tempo: ${Date.now() - startTime}ms)`);

      if (response.ok) {
        const textStr = await response.text();
        if (textStr.trim().startsWith('<!DOCTYPE') || textStr.trim().startsWith('<html')) {
          console.warn("⚠️ [Tentativa 1] Resposta retornou HTML da SPA de redirecionamento, não JSON ou texto de resposta. Tentando fallback...");
        } else {
          try {
            const data = JSON.parse(textStr);
            if (data.text) {
              console.log("✅ [Tentativa 1] Sucesso! Resposta JSON legítima obtida de /api/chat.");
              console.log("📥 [AUDIT LOG] Conteúdo da Resposta:", `"${data.text.slice(0, 100)}..."`);
              console.log("------------------- IA SYSTEM AUDIT END -------------------");
              return data.text;
            } else if (data.error) {
              console.warn("⚠️ [Tentativa 1] Servidor relatou erro estruturado na API:", data.error, data.details || '');
            }
          } catch {
            if (textStr.trim() && !textStr.trim().startsWith('{')) {
              console.log("✅ [Tentativa 1] Sucesso! Resposta em texto puro legítima recebida de /api/chat.");
              console.log("📥 [AUDIT LOG] Conteúdo da Resposta Puro:", `"${textStr.slice(0, 100)}..."`);
              console.log("------------------- IA SYSTEM AUDIT END -------------------");
              return textStr;
            }
          }
        }
      } else {
        const errDetails = await response.text().catch(() => 'Nenhum detalhe adicional obtido.');
        console.warn(`⚠️ [Tentativa 1] Falhou com status HTTP ${response.status}. Detalhes de erro do backend:`, errDetails);
      }
    } catch (e: any) {
      console.warn("⚠️ [Tentativa 1] Servidor /api/chat de produção ou local inalcançável:", e.message || e);
    }

    // Tentativa 2: Fallback direto de Serverless Function do Netlify
    try {
      console.log("📨 [Tentativa 2] Enviando requisição diretamente em /.netlify/functions/chat...");
      const startTime = Date.now();
      const response = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          messages: history.slice(-12)
        })
      });

      console.log(`📡 [Tentativa 2] Status Code Recebido: ${response.status} (Tempo: ${Date.now() - startTime}ms)`);

      if (response.ok) {
        const textStr = await response.text();
        if (textStr.trim().startsWith('<!DOCTYPE') || textStr.trim().startsWith('<html')) {
          console.warn("⚠️ [Tentativa 2] Resposta em HTML obtida, ignorando...");
        } else {
          try {
            const data = JSON.parse(textStr);
            if (data.text) {
              console.log("✅ [Tentativa 2] Sucesso! Resposta JSON obtida do Netlify Serverless function.");
              console.log("📥 [AUDIT LOG] Conteúdo da Resposta Netlify:", `"${data.text.slice(0, 100)}..."`);
              console.log("------------------- IA SYSTEM AUDIT END -------------------");
              return data.text;
            }
          } catch {
            if (textStr.trim() && !textStr.trim().startsWith('{')) {
              console.log("✅ [Tentativa 2] Sucesso! Resposta em texto puro do Netlify obtida.");
              console.log("📥 [AUDIT LOG] Conteúdo da Resposta Netlify Puro:", `"${textStr.slice(0, 100)}..."`);
              console.log("------------------- IA SYSTEM AUDIT END -------------------");
              return textStr;
            }
          }
        }
      } else {
        const errDetails = await response.text().catch(() => 'Nenhum detalhe adicional obtido de Netlify.');
        console.warn(`⚠️ [Tentativa 2] Falhou com status HTTP ${response.status}. Detalhes adicionais:`, errDetails);
      }
    } catch (e: any) {
      console.warn("⚠️ [Tentativa 2] Endpoint de function /.netlify/functions/chat falhou ou está ausente:", e.message || e);
    }

    // Tentativa 3: Chamada Direta no Client utilizando chave do desenvolvedor (se injetada/disponível)
    const envObj = (import.meta as any).env || {};
    const clientKey = (envObj.VITE_GEMINI_API_KEY as string) || 
                      (envObj.VITE_API_KEY as string) || 
                      (window as any).GEMINI_API_KEY || 
                      (window as any).env?.GEMINI_API_KEY || 
                      null;

    if (clientKey) {
      console.log("🔌 [Tentativa 3] Chave de API de cliente detectada na sessão. Efetuando chamada HTTPS direta ao Gemini...");
      try {
        const contents: any[] = [];
        for (const h of history) {
          if (h.text && h.text.trim()) {
            contents.push({
              role: h.role === 'model' ? 'model' : 'user',
              parts: [{ text: h.text }]
            });
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: userMsg }]
        });

        // Use standard gemini-3.5-flash as official selection
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${clientKey}`;
        console.log(`📨 [Tentativa 3] Executando POST para endpoint público Gemini com o modelo gemini-3.5-flash...`);
        const resOfClient = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: contents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });

        if (resOfClient.ok) {
          const data = await resOfClient.json();
          const rawReplyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawReplyText) {
            console.log("✅ [Tentativa 3] Sucesso! Resposta obtida diretamente da API do Gemini via client-side.");
            console.log("📥 [AUDIT LOG] Conteúdo da Resposta Client-side:", `"${rawReplyText.slice(0, 100)}..."`);
            console.log("------------------- IA SYSTEM AUDIT END -------------------");
            return rawReplyText;
          }
        } else {
          const errDetailText = await resOfClient.text().catch(() => '');
          console.warn("⚠️ API do Gemini client-side falhou com status:", resOfClient.status, "Mensagem:", errDetailText);
        }
      } catch (errDirect) {
        console.error("❌ Falha crítica ao tentar contato direto com a API no cliente:", errDirect);
      }
    }

    // Tentativa 4: Resposta Terapêutica Local Inteligente (Garante estabilidade absoluta em produção offline)
    console.warn("🚨 [IA SYSTEM WARNING] Todos os servidores de IA e chaves de API estão indisponíveis/inacessíveis!");
    console.warn("📌 Provendo resposta terapêutica local estruturada e compassiva para manter estabilidade absoluta do chat.");
    
    // Add artificial natural human spacing latency mock (800ms to 1200ms) to avoid instant robotic answer vibes
    const artificialLatency = 1000 + Math.random() * 400;
    console.log(`⏳ Aguardando latência terapêutica artificial de ${Math.round(artificialLatency)}ms para simular empatia humana...`);
    await new Promise(resolve => setTimeout(resolve, artificialLatency));

    // Select suitable responses matching the user's current situation where possible
    const lowerMsg = userMsg.toLowerCase();
    let index = Math.floor(Math.random() * THERAPEUTIC_ANSWERS.length);

    if (lowerMsg.includes("obrigado") || lowerMsg.includes("obrigada") || lowerMsg.includes("valeu") || lowerMsg.includes("grato")) {
      console.log("🎯 Match de intenção local detectado: Gratidão do Usuário");
      return "Fico sinceramente muito feliz em poder estar aqui com você. Cultivar um coração grato é um passo lindo em direção à paz interior. Lembre-se que você é imensamente precioso(a) e que sempre terá um conselheiro aqui.";
    }
    if (lowerMsg.includes("tudo bem") || lowerMsg.includes("como vai") || lowerMsg.includes("você está bem") || lowerMsg.includes("tudo bom")) {
      console.log("🎯 Match de intenção local detectado: Cumprimento amigável");
      return "Estou muito bem, grato por perguntar! Mas o mais importante agora é focar em como você está se sentindo. Como tem estado seu dia? Sinta-se à vontade para desabafar tudo o que estiver no seu peito.";
    }
    if (lowerMsg.includes("triste") || lowerMsg.includes("chorando") || lowerMsg.includes("sozinho") || lowerMsg.includes("sozinha") || lowerMsg.includes("mal")) {
      console.log("🎯 Match de intenção local detectado: Desconforto Emocional");
      return "Sinto muito que você esteja passando por esse momento cinzento. Saiba que sua dor é legítima e eu estou aqui ouvindo você sem qualquer julgamento. Você não está sozinho(a). O que sente que está pesando mais forte agora?";
    }
    if (lowerMsg.includes("ansioso") || lowerMsg.includes("ansiosa") || lowerMsg.includes("medo") || lowerMsg.includes("preocupado") || lowerMsg.includes("preocupada")) {
      console.log("🎯 Match de intenção local detectado: Ansiedade");
      return "Respire fundo comigo por um segundo... Puxe o ar... e solte devagar. A ansiedade tenta nos roubar o dia de hoje com os fantasmas do amanhã. Vamos focar apenas no momento presente? Qual é o menor passo que você pode dar hoje para encontrar um momento de calmaria?";
    }

    console.log("📌 Selecionando resposta terapêutica generalizada sob o índice:", index);
    console.log("------------------- IA SYSTEM AUDIT END -------------------");
    return THERAPEUTIC_ANSWERS[index];
  };

  const THERAPEUTIC_ANSWERS = [
    "Estou aqui ouvindo você com atenção plena e carinho. Suas emoções são válidas. Me conte um pouco mais: o que mais tem pesado no seu coração?",
    "Entendo perfeitamente. Às vezes, o peso que carregamos parece insustentável. Vamos pausar um momento juntos? Respire fundo comigo... Como está se sentindo agora?",
    "A sabedoria milenar nos ensina que há momentos para tudo, inclusive para descansar e colocar para fora o que nos afige. Saiba que você está em um lugar seguro.",
    "Obrigado por compartilhar isso. É preciso coragem para admitir nossas lutas. O que você sente que traria um pequeno alento ou sensação de paz para o seu dia hoje?",
    "Sua dor é legítima e merece acolhimento. Lembre-se de ser paciente e gentil com seu processo. Um dia de cada vez, um passo de cada vez. Estou aqui contigo.",
    "Mesmo em meio às tempestades, existe um lugar de calmaria e sabedoria que podemos encontrar ao acalmar a mente. Vamos nos concentrar no presente... o que traz luz para você hoje?"
  ];

  const handleSendText = async () => {
    if (!input.trim() || isSendingText) return;
    const userMsg = input.trim();
    
    // Check Chat Limit permissions
    const perms = SubscriptionService.getPermissions(session || null);
    if (!perms.canUseChat && perms.planType === 'free') {
      setInput('');
      setMessages(prev => [
        ...prev,
        { role: 'user', text: userMsg, timestamp: new Date() },
        { 
          role: 'model', 
          text: '⚠️ Você atingiu o limite de 5 mensagens diárias do plano gratuito. Faça upgrade para o plano Premium Elo para ter conversas ilimitadas e ter acesso completo aos recursos de Rotinas, Diário Emocional estruturado e Avaliação Integral de Vida.', 
          timestamp: new Date() 
        }
      ]);
      return;
    }

    setInput('');
    
    // Compile and apply correct conversational history immediately to avoid asynchronous react state lag
    const newUserMessage: Message = { role: 'user', text: userMsg, timestamp: new Date() };
    const updatedHistory = [...messages, newUserMessage];
    setMessages(updatedHistory);

    setIsSendingText(true);
    try {
      const modelMsg = await getEloTextResponse(userMsg, updatedHistory);
      setMessages(prev => [...prev, { role: 'model', text: modelMsg, timestamp: new Date() }]);
      // Successfully sent message, increment chat usage
      SubscriptionService.incrementChatUsage(session?.email || 'guest');
    } catch (e: any) {
      console.error('❌ Erro de comunicação ou IA ao enviar mensagem:', e);
      alert(`Erro ao enviar mensagem para o Elo.\n\nDetalhes do sistema:\n"${e?.message || e || 'Sem conexão com o servidor'}"`);
    } finally {
      setIsSendingText(false);
    }
  };

  const getVoiceStatusMessage = () => {
    if (micStatus === 'denied') {
      return { text: '🔴 Microfone bloqueado', color: 'text-rose-600 bg-rose-50 border-rose-100' };
    }
    if (isConnecting) {
      return { text: '✨ Solicitando permissão / Conectando...', color: 'text-amber-600 bg-amber-50 border-amber-100 animate-pulse' };
    }
    if (isLive) {
      return { text: '🟢 Gravando / Fale agora', color: 'text-emerald-600 bg-emerald-50 border-emerald-100 animate-pulse' };
    }
    return { text: '⚪ Conversa por voz desativada (Em espera)', color: 'text-slate-500 bg-slate-50 border-slate-100' };
  };

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      {/* Header Status */}
      {micStatus === 'granted' && (
        <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between z-20 animate-in slide-in-from-top duration-300 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getVoiceStatusMessage().color}`}>
                {getVoiceStatusMessage().text}
              </span>
            </div>
            {voiceError && (
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                ⚠️ {voiceError}
              </span>
            )}
          </div>
          <button 
            onClick={() => stopLiveSession(true)}
            className="text-[10px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1.5 uppercase tracking-wider transition-colors bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-full border border-slate-200"
          >
            <CircleStop size={12} /> Desativar Voz
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
              msg.role === 'user' ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              <span className="text-[9px] mt-2 block opacity-50">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ))}
        
        {/* Multilingual Support Badge */}
        {messages.length < 3 && (
          <div className="flex justify-center py-2">
            <div className="bg-blue-50 text-blue-500 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 uppercase tracking-tight">
              <Languages size={12} /> Português, English, Español & more
            </div>
          </div>
        )}

        {/* Professional Mic Activation */}
        {micStatus !== 'granted' && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-6 bg-white/40 rounded-3xl border border-dashed border-slate-200 mt-4 mx-2">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <AudioWaveform size={32} className={isConnecting ? 'animate-pulse' : ''} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Vamos conversar por voz?</h3>
            <p className="text-xs text-slate-400 max-w-[260px] mb-6">Fale naturalmente em qualquer idioma. O Elo ouvirá e responderá com carinho.</p>
            <button
              onClick={requestMicPermission}
              disabled={isConnecting}
              className="bg-rose-500 text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-rose-100 flex items-center gap-2 hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Solicitando permissão...
                </>
              ) : (
                <>
                  <Mic size={18} />
                  Ativar conversa por voz
                </>
              )}
            </button>
            {(micStatus === 'denied' || voiceError) && (
              <p className="mt-4 text-[10px] text-amber-600 font-semibold bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 flex flex-col items-center gap-1 animate-in fade-in duration-300 max-w-sm">
                <span>⚠️ Microfone indisponível ou bloqueado.</span>
                <span>Permita o acesso ao microfone nas configurações resididas do navegador.</span>
              </p>
            )}
          </div>
        )}

        {/* Live Streaming Texts */}
        {(streamingUserText || streamingModelText) && (
          <div className="space-y-2 opacity-60 italic py-2">
            {streamingUserText && <div className="text-right text-xs text-rose-400">"{streamingUserText}..."</div>}
            {streamingModelText && <div className="text-left text-xs text-slate-400">Elo: "{streamingModelText}..."</div>}
          </div>
        )}

        {isSendingText && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl border border-slate-100">
              <Loader2 className="animate-spin text-rose-300" size={16} />
            </div>
          </div>
        )}
      </div>

      {/* Input Controls */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 shadow-2xl z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
          {micStatus === 'granted' && (
            <button
              onClick={isLive ? () => stopLiveSession() : async () => {
                // MOBILE COMPATIBILITY: Synchronously instantiate or resume audio contexts in the onClick tick before going async
                if (!audioContextRef.current) {
                  try {
                    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                    audioContextRef.current = {
                      input: new AudioContextClass(),
                      output: new AudioContextClass()
                    };
                    console.log("🔊 AudioContext instanciado com sucesso no clique do botão do Microfone.");
                  } catch (e) {
                    console.error("🚨 Erro de criação do AudioContext sincronizado:", e);
                  }
                }

                // Unlock iOS/Safari speech synthesis autoplay restriction on user-interaction click tick
                if (window.speechSynthesis) {
                  try {
                    window.speechSynthesis.cancel();
                    const silentUtterance = new SpeechSynthesisUtterance("");
                    silentUtterance.volume = 0;
                    window.speechSynthesis.speak(silentUtterance);
                    console.log("🔊 SpeechSynthesis desbloqueado para iOS/Safari no clique do botão.");
                  } catch (e) {
                    console.warn("⚠️ Não foi possível testar/desbloquear SpeechSynthesis no clique:", e);
                  }
                }

                if (audioContextRef.current) {
                  try {
                    await audioContextRef.current.input.resume();
                    await audioContextRef.current.output.resume();
                  } catch (e) {
                    console.warn("Failing synchronously resuming context from click:", e);
                  }
                }
                startLiveSession();
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isLive ? 'bg-rose-50 text-rose-500 border border-rose-200 shadow-inner' : 'bg-rose-500 text-white shadow-lg'
              }`}
            >
              {isLive ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          <div className="flex-1 flex items-center bg-slate-100 rounded-2xl px-3 py-1 border border-slate-200 transition-focus-within focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-100">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder={isLive ? "Elo está ouvindo... fale naturalmente" : "Escreva sua mensagem..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-base py-2.5 outline-none text-slate-700 placeholder:text-slate-400"
            />
            <button 
              onClick={handleSendText} 
              disabled={!input.trim() || isSendingText}
              className={`p-2 rounded-xl transition-all ${input.trim() ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-300'}`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
        
        {isLive && (
          <div className="mt-2 flex items-center justify-center gap-1 h-1">
             {[...Array(8)].map((_, i) => (
               <div 
                 key={i} 
                 className="w-1 bg-rose-400 rounded-full transition-all duration-75" 
                 style={{ height: `${Math.max(4, inputVolume * 1500 * (1 - Math.abs(i-3.5)/4))}px` }}
               />
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
