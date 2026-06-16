import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper to encode raw 16-bit linear PCM audio into a standard playable WAV buffer
function encodeWavHeader(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const header = Buffer.alloc(44);
  const fileSizeBytes = pcmBuffer.length + 36;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  header.write('RIFF', 0); // ChunkID
  header.writeUInt32LE(fileSizeBytes, 4); // ChunkSize
  header.write('WAVE', 8); // Format
  header.write('fmt ', 12); // Subchunk1ID
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22); // NumChannels
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(byteRate, 28); // ByteRate
  header.writeUInt16LE(blockAlign, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  header.write('data', 36); // Subchunk2ID
  header.writeUInt32LE(pcmBuffer.length, 40); // Subchunk2Size

  return Buffer.concat([header, pcmBuffer]);
}

// Standard visual instructions for Elo
import { SYSTEM_INSTRUCTION } from './src/geminiService';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("⚠️ AVISO: Nenhuma variável de ambiente de chave de API do Gemini (GEMINI_API_KEY ou API_KEY) foi configurada. As conexões com a IA irão falhar.");
  }

  // Lazy initialize Google Gen AI
  const ai = new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route: Server-side secure Chat proxy with robust message normalization
  app.post('/api/chat', async (req, res) => {
    const { message, messages } = req.body;
    console.log(`💬 Recebida requisição de chat. Mensagem: "${message}". Histórico recebido: ${messages ? messages.length : 0} itens.`);

    if (!message) {
      console.warn("⚠️ Mensagem vazia recebida na rota /api/chat");
      return res.status(400).json({ error: 'A mensagem é obrigatória.' });
    }

    try {
      const rawItems: { role: 'user' | 'model'; text: string }[] = [];

      // Parse and clean conversation history
      if (messages && Array.isArray(messages)) {
        for (const msg of messages) {
          if (msg && typeof msg.text === 'string' && msg.text.trim()) {
            rawItems.push({
              role: msg.role === 'model' ? 'model' : 'user',
              text: msg.text.trim()
            });
          }
        }
      }

      // Add the current user message at the very end if not already present
      const cleanCurrent = message.trim();
      if (cleanCurrent) {
        if (rawItems.length === 0 || rawItems[rawItems.length - 1].text !== cleanCurrent || rawItems[rawItems.length - 1].role !== 'user') {
          rawItems.push({
            role: 'user',
            text: cleanCurrent
          });
        }
      }

      // Merge consecutive same-role messages and ensure we always start with a 'user' message
      const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

      for (const item of rawItems) {
        if (contents.length === 0) {
          if (item.role === 'user') {
            contents.push({
              role: 'user',
              parts: [{ text: item.text }]
            });
          } else {
            console.log("ℹ️ Pulando mensagem de modelo inicial no histórico para obedecer regras de validação do Gemini.");
            continue;
          }
        } else {
          const last = contents[contents.length - 1];
          if (last.role === item.role) {
            console.log(`ℹ️ Mesclando mensagens consecutivas da role '${item.role}'`);
            last.parts[0].text += '\n\n' + item.text;
          } else {
            contents.push({
              role: item.role,
              parts: [{ text: item.text }]
            });
          }
        }
      }

      // Safety fallback to guarantee we have at least one user message
      if (contents.length === 0 && cleanCurrent) {
        contents.push({
          role: 'user',
          parts: [{ text: cleanCurrent }]
        });
      }

      console.log(`📊 Enviando ${contents.length} turnos alternados e higienizados para o Gemini.`);

      if (!apiKey) {
        throw new Error('Chave de API do Gemini não está disponível no servidor. Por favor, configure a chave GEMINI_API_KEY no painel de Segredos.');
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      const replyText = response.text || '';
      console.log(`✅ Resposta gerada com sucesso pelo Gemini (${replyText.length} caracteres).`);
      res.json({ text: replyText });
    } catch (err: any) {
      console.error('❌ Erro na execução da rota /api/chat express proxy:', err);
      res.status(500).json({ 
        error: err?.message || 'Falha interna inesperada ao chamar o Gemini.',
        details: err?.stack || ''
      });
    }
  });

  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // API Route: Premium Server-Side Text-to-Speech using ElevenLabs (with robust fallback to Gemini TTS "Charon")
  app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'O texto é obrigatório.' });
    }

    // Clean up markdown/extra characters so response sounds clean and warm
    const cleanText = text
      .replace(/[\*\#\_]/g, '')
      .replace(/[\r\n]+/g, ' ')
      .trim();

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    const elevenLabsVoiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6OBv8qBiU2ptAsb'; // Adam as spectacular deep prebuilt male voice

    if (elevenLabsApiKey && elevenLabsApiKey !== 'MY_ELEVENLABS_API_KEY' && elevenLabsApiKey.trim() !== '') {
      console.log(`🔊 [ELEVENLABS TTS] Gerando áudio premium via ElevenLabs (Voice ID: ${elevenLabsVoiceId}) para texto: "${cleanText.slice(0, 60)}..."`);
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
            'accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text: cleanText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.82,          // High stability for serene, calm, confident, and warm tone
              similarity_boost: 0.88,   // Strong similarity boost for vocal richness
              style: 0.05,              // Slight styling to maximize emotional warmth
              use_speaker_boost: true
            }
          })
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          console.log(`✅ [ELEVENLABS TTS] Áudio premium gerado com sucesso via ElevenLabs (${audioBuffer.byteLength} bytes).`);
          return res.json({ audio: base64Audio, mimeType: 'audio/mpeg' });
        } else {
          const errText = await response.text();
          console.warn(`⚠️ [ELEVENLABS TTS] Erro retornado pela API da ElevenLabs (${response.status}): ${errText}. Prosseguindo para o fallback Gemini...`);
        }
      } catch (err) {
        console.warn(`⚠️ [ELEVENLABS TTS] Falha de comunicação na ElevenLabs:`, err, `. Redirecionando para o fallback Gemini...`);
      }
    }

    // FALLBACK 1: Gemini TTS with deep masculine "Charon" voice
    try {
      if (!apiKey) {
        throw new Error('Chave de API do Gemini não está disponível no servidor.');
      }

      console.log(`🔊 [GEMINI FALLBACK] Gerando áudio premium com voz "Charon" para texto: "${cleanText.slice(0, 60)}..."`);

      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ 
          parts: [{ 
            text: `Diga o texto a seguir com pausas confortáveis, de forma calmante, pacífica, poética e com uma entonação profundamente sábia, acolhedora, masculina e humana: ${cleanText}` 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' }
            }
          }
        }
      });

      const base64RawPcm = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64RawPcm) {
        throw new Error('O modelo do Gemini não retornou nenhum dado de áudio válido.');
      }

      // Convert raw 24KHz pcm mono into playable wav data base64
      const pcmBuffer = Buffer.from(base64RawPcm, 'base64');
      const wavBuffer = encodeWavHeader(pcmBuffer, 24000);
      const base64Wav = wavBuffer.toString('base64');

      console.log(`✅ [GEMINI FALLBACK] Áudio premium gerado com sucesso (${wavBuffer.length} bytes).`);
      return res.json({ audio: base64Wav, mimeType: 'audio/wav' });
    } catch (err: any) {
      console.error('❌ [SERVER TTS FALLBACK] Erro ao sintetizar voz no servidor:', err);
      res.status(500).json({ 
        error: 'Erro na síntese de voz premium.',
        details: err?.message || ''
      });
    }
  });

  // Setup WebSocket Server for Live Audio Streaming
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (clientWs: WebSocket, request) => {
    // Force voice name to 'Charon' to guarantee a deep, calm, serene masculine presence
    const voiceName = 'Charon';

    console.log(`🔌 Novo cliente de voz conectado. Voz unificada selecionada: ${voiceName}`);

    let liveSession: any = null;

    try {
      // Connect to Gemini Live API from server-side
      liveSession = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            console.log('✅ Conectado com sucesso à Sessão de Voz do Gemini.');
            clientWs.send(JSON.stringify({ type: 'session_ready' }));
          },
          onmessage: (msg: LiveServerMessage) => {
            // Relay the server message immediately to the client browser
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify(msg));
            }
          },
          onclose: () => {
            console.log('❌ Sessão de Voz do Gemini encerrada pelo servidor de IA.');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close();
            }
          },
          onerror: (err) => {
            console.error('🚨 Erro na Sessão de Voz do Gemini:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Erro do servidor de Voz.' }));
              clientWs.close();
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });

      // Handle messages from the browser client
      clientWs.on('message', async (data) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.audio && payload.audio.data) {
            if (liveSession) {
              await liveSession.sendRealtimeInput({
                audio: {
                  data: payload.audio.data,
                  mimeType: payload.audio.mimeType || 'audio/pcm;rate=16000'
                }
              });
            }
          }
        } catch (err) {
          console.error('Erro na recepção de áudio do cliente:', err);
        }
      });

      clientWs.on('close', () => {
        console.log('🔌 Cliente de voz desconectou.');
        if (liveSession) {
          try {
            liveSession.close();
          } catch (e) {}
        }
      });

    } catch (err: any) {
      console.error('Erro ao conectar com Gemini Live:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'error', message: 'Falha ao estabelecer ligação com a IA de voz.' }));
        clientWs.close();
      }
    }
  });

  // Handle upgrade requests for WebSockets
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname.startsWith('/api/live')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Elo rodando perfeitamente na porta ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha crítica ao iniciar o servidor:', err);
});
