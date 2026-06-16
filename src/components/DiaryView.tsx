import React, { useState, useEffect } from 'react';
import { DiaryEntry, UserSession } from '../types';
import { 
  Heart, Calendar, Trash2, Save, X, Sparkles, BookOpen, Compass, 
  Trash, Award, Eye, Feather, HelpCircle, Activity, ChevronRight, 
  CheckCircle2, Plus, ArrowRight, Share2, Shield, Flame, RotateCcw,
  Smile, Frown, Compass as PeaceIcon, CloudLightning, Coffee, Sunset
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Formats for local persistence keys
// We support both general and email-scoped keys for solid privacy patterns
interface PersonalDream {
  id: string;
  title: string;
  category: 'criativo' | 'saude' | 'carreira' | 'alma' | 'relacional';
  emoji: string;
  purpose: string;
  steps: { id: string; text: string; completed: boolean }[];
}

interface LimitingBelief {
  id: string;
  date: string;
  original: string;
  distortion: string;
  liberating: string;
}

interface IdentityReflection {
  id: string;
  anchors: string;
  gifts: string;
  contribution: string;
  lastUpdated: string;
}

const GRATITUDE_PROMPTS = [
  "Qual privilégio imperceptível você percebeu hoje que a maioria das pessoas deixaria passar?",
  "O que em seu corpo físico você gostaria de agradecer por funcionar tão bem hoje?",
  "Qual lição oculta veio de forma mansa após o desafio mais complexo de hoje?",
  "Quem é a pessoa que traz alívio silencioso à sua existência, e qual pequena cena com ela te fez sorrir?",
  "Se você pudesse abraçar a si mesmo de 5 anos atrás, qual bênção de hoje você diria que o futuro reservou?",
  "Que sabor, som, toque ou elemento da natureza confortou seus sentidos hoje?"
];

const COGNITIVE_DISTORTIONS = [
  { id: 'catastrofe', title: 'Antecipação de Catástrofe', desc: 'Prever o pior cenário e agir como se fosse uma verdade inevitável.' },
  { id: 'rotulo', title: 'Rotulagem Rígida', desc: 'Colar uma etiqueta pesada e estática sobre você ("Eu sou fraco", "Sempre falho") em vez de descrever um momento passageiro.' },
  { id: 'tudo-nada', title: 'Tudo ou Nada (8 ou 80)', desc: 'Esquecer o caminho cinza e as nuances, achando que se não for perfeito, é um desastre absoluto.' },
  { id: 'leitura-mente', title: 'Leitura de Mente', desc: 'Assumir que os outros estão te julgando negativamente sem qualquer prova tangível.' },
  { id: 'deveria', title: 'Imperativos de Cobrança ("Deveria")', desc: 'Exigir regras absolutas e irreais sobre como você ou a vida deveriam funcionar.' }
];

interface DiaryViewProps {
  session: UserSession;
}

export const DiaryView: React.FC<DiaryViewProps> = ({ session }) => {
  // Use emailKey dynamically computed from the parent session prop
  const emailKey = session?.email ? session.email.replace(/[^a-zA-Z0-9]/g, '_') : 'guest';

  // Main UI navigation under Transformation Space
  const [activeTab, setActiveTab] = useState<'diary' | 'exercises' | 'vision' | 'drainage' | 'evolution'>('diary');

  // Sub-navigation inside Exercises
  const [exerciseMode, setExerciseMode] = useState<'beliefs' | 'forgiveness' | 'identity' | 'menu'>('menu');

  // Core Data States
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [dreams, setDreams] = useState<PersonalDream[]>([]);
  const [beliefs, setBeliefs] = useState<LimitingBelief[]>([]);
  const [identity, setIdentity] = useState<IdentityReflection | null>(null);

  // Feeling options with nuanced, empathetic descriptions
  const feelings = [
    { label: 'Acolhido & Calmo', emoji: '🧘', color: 'text-teal-600 bg-teal-50 border-teal-100', bg: '#f0fdf4' },
    { label: 'Inquieto / Ansioso', emoji: '🌩️', color: 'text-amber-600 bg-amber-50 border-amber-100', bg: '#fffbeb' },
    { label: 'Fortalecido / Grato', emoji: '✨', color: 'text-rose-600 bg-rose-50 border-rose-100', bg: '#fff1f2' },
    { label: 'Exausto / Desgastado', emoji: '😴', color: 'text-purple-600 bg-purple-50 border-purple-100', bg: '#faf5ff' },
    { label: 'Nostálgico / Melancólico', emoji: '🍂', color: 'text-blue-600 bg-blue-50 border-blue-100', bg: '#eff6ff' },
    { label: 'Redescobrindo Direção', emoji: '🧭', color: 'text-sky-600 bg-sky-50 border-sky-100', bg: '#f0f9ff' }
  ];

  /* ------------------- DIARY LOGIC ------------------- */
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [currentEntry, setCurrentEntry] = useState<Partial<DiaryEntry>>({
    feeling: 'Acolhido & Calmo 🧘',
    content: '',
    gratitude: ''
  });

  // Load resources from localStorage
  useEffect(() => {
    // 1. Diary Entries (combining standard template 'elo_diary' for backward compatibility + userScoped logic)
    const savedDiary = localStorage.getItem(`elo_diary_${emailKey}`) || localStorage.getItem('elo_diary');
    if (savedDiary) {
      try {
        setEntries(JSON.parse(savedDiary));
      } catch (e) {
        console.error(e);
      }
    } else {
      setEntries([]);
    }

    // 2. Dreams
    const savedDreams = localStorage.getItem(`elo_dreams_${emailKey}`);
    if (savedDreams) {
      try { setDreams(JSON.parse(savedDreams)); } catch (e) { console.error(e); }
    } else {
      // Default inspiring dreams
      const defaults: PersonalDream[] = [
        {
          id: 'd-1',
          title: 'Cultivar Resiliência Interna',
          category: 'alma',
          emoji: '🍃',
          purpose: 'Permanecer centrado mesmo sob pressões e ventanias externas.',
          steps: [
            { id: 'ds-1', text: 'Respirar voluntariamente antes de responder a mensagens difíceis', completed: false },
            { id: 'ds-2', text: 'Concluir minha prática diária de 3 minutos de mindfulness', completed: true },
            { id: 'ds-3', text: 'Escrever no diário de clareza mental quando me sentir sobrecarregado', completed: false }
          ]
        },
        {
          id: 'd-2',
          title: 'Conquistar Harmonia Saudável',
          category: 'saude',
          emoji: '🍵',
          purpose: 'Restabelecer uma relação amorosa, consciente e disciplinada com o meu repouso e alimentação.',
          steps: [
            { id: 'ds-4', text: 'Desligar telas às 22h por três dias consecutivos', completed: false },
            { id: 'ds-5', text: 'Separar 15 minutos do dia para me alongar devagar', completed: false }
          ]
        }
      ];
      setDreams(defaults);
      localStorage.setItem(`elo_dreams_${emailKey}`, JSON.stringify(defaults));
    }

    // 3. Beliefs
    const savedBeliefs = localStorage.getItem(`elo_beliefs_${emailKey}`);
    if (savedBeliefs) {
      try { setBeliefs(JSON.parse(savedBeliefs)); } catch (e) { console.error(e); }
    } else {
      // Default examples of beliefs transformation
      const defaultBeliefs: LimitingBelief[] = [
        {
          id: 'b-1',
          date: 'Guia de Exemplo',
          original: 'Acho que tenho que resolver os problemas de todas as pessoas para merecer o carinho delas.',
          distortion: 'Leitura de Mente e Imperativos (Deveria)',
          liberating: 'Eu ajudo por amor e escolha, mas aceito que meu valor pessoal não depende de consertar o mundo alheio.'
        }
      ];
      setBeliefs(defaultBeliefs);
      localStorage.setItem(`elo_beliefs_${emailKey}`, JSON.stringify(defaultBeliefs));
    }

    // 4. Identity Ref
    const savedId = localStorage.getItem(`elo_identity_${emailKey}`);
    if (savedId) {
      try { setIdentity(JSON.parse(savedId)); } catch (e) { console.error(e); }
    }

    // Pick a random gratitude prompt to begin with
    setSelectedPromptIndex(Math.floor(Math.random() * GRATITUDE_PROMPTS.length));
  }, [emailKey]);

  const saveDiaryBackend = (newEntries: DiaryEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem(`elo_diary_${emailKey}`, JSON.stringify(newEntries));
    localStorage.setItem('elo_diary', JSON.stringify(newEntries)); // Sync legacy as well
  };

  const handleSaveEntry = () => {
    if (!currentEntry.content?.trim()) return;

    const fresh: DiaryEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      feeling: currentEntry.feeling || 'Acolhido & Calmo 🧘',
      content: currentEntry.content.trim(),
      gratitude: currentEntry.gratitude?.trim() || ''
    };

    const next = [fresh, ...entries];
    saveDiaryBackend(next);
    setIsEditingEntry(false);
    setCurrentEntry({ feeling: 'Acolhido & Calmo 🧘', content: '', gratitude: '' });
    setSelectedPromptIndex(Math.floor(Math.random() * GRATITUDE_PROMPTS.length));
  };

  const handleDeleteEntry = (id: string) => {
    const next = entries.filter(e => e.id !== id);
    saveDiaryBackend(next);
  };

  /* ------------------- DREAMS & VISION BOARD LOGIC ------------------- */
  const [showDreamForm, setShowDreamForm] = useState(false);
  const [newDreamTitle, setNewDreamTitle] = useState('');
  const [newDreamCategory, setNewDreamCategory] = useState<'criativo' | 'saude' | 'carreira' | 'alma' | 'relacional'>('alma');
  const [newDreamEmoji, setNewDreamEmoji] = useState('✨');
  const [newDreamPurpose, setNewDreamPurpose] = useState('');
  const [newDreamStepText, setNewDreamStepText] = useState('');
  const [tempSteps, setTempSteps] = useState<string[]>([]);

  const handleCreateDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDreamTitle.trim() || !newDreamPurpose.trim()) return;

    const rawSteps = tempSteps.length > 0 ? tempSteps : ['Dar um micro-passo leve em direção a este objetivo'];
    const formedSteps = rawSteps.map((s, idx) => ({
      id: `ds-${Date.now()}-${idx}`,
      text: s,
      completed: false
    }));

    const fresh: PersonalDream = {
      id: `d-${Date.now()}`,
      title: newDreamTitle.trim(),
      category: newDreamCategory,
      emoji: newDreamEmoji,
      purpose: newDreamPurpose.trim(),
      steps: formedSteps
    };

    const next = [...dreams, fresh];
    setDreams(next);
    localStorage.setItem(`elo_dreams_${emailKey}`, JSON.stringify(next));

    // Reset form
    setNewDreamTitle('');
    setNewDreamPurpose('');
    setNewDreamEmoji('✨');
    setTempSteps([]);
    setNewDreamStepText('');
    setShowDreamForm(false);
  };

  const handleAddTempStep = () => {
    if (newDreamStepText.trim()) {
      setTempSteps([...tempSteps, newDreamStepText.trim()]);
      setNewDreamStepText('');
    }
  };

  const handleToggleDreamStep = (dreamId: string, stepId: string) => {
    const next = dreams.map(d => {
      if (d.id === dreamId) {
        return {
          ...d,
          steps: d.steps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s)
        };
      }
      return d;
    });
    setDreams(next);
    localStorage.setItem(`elo_dreams_${emailKey}`, JSON.stringify(next));
  };

  const handleDeleteDream = (id: string) => {
    const next = dreams.filter(d => d.id !== id);
    setDreams(next);
    localStorage.setItem(`elo_dreams_${emailKey}`, JSON.stringify(next));
  };

  /* ------------------- BELIEFS LOGIC ------------------- */
  const [showBeliefForm, setShowBeliefForm] = useState(false);
  const [beliefOriginal, setBeliefOriginal] = useState('');
  const [beliefDistortion, setBeliefDistortion] = useState(COGNITIVE_DISTORTIONS[0].title);
  const [beliefLiberating, setBeliefLiberating] = useState('');

  const handleAddBelief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!beliefOriginal.trim() || !beliefLiberating.trim()) return;

    const fresh: LimitingBelief = {
      id: `b-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      original: beliefOriginal.trim(),
      distortion: beliefDistortion,
      liberating: beliefLiberating.trim()
    };

    const next = [fresh, ...beliefs];
    setBeliefs(next);
    localStorage.setItem(`elo_beliefs_${emailKey}`, JSON.stringify(next));

    setBeliefOriginal('');
    setBeliefLiberating('');
    setShowBeliefForm(false);
  };

  const handleDeleteBelief = (id: string) => {
    const next = beliefs.filter(b => b.id !== id);
    setBeliefs(next);
    localStorage.setItem(`elo_beliefs_${emailKey}`, JSON.stringify(next));
  };

  /* ------------------- IDENTITY REFLECTION LOGIC ------------------- */
  const [idAnchors, setIdAnchors] = useState('');
  const [idGifts, setIdGifts] = useState('');
  const [idContribution, setIdContribution] = useState('');
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);

  useEffect(() => {
    if (identity) {
      setIdAnchors(identity.anchors || '');
      setIdGifts(identity.gifts || '');
      setIdContribution(identity.contribution || '');
    } else {
      setIdAnchors('');
      setIdGifts('');
      setIdContribution('');
    }
  }, [identity]);

  const handleSaveIdentity = () => {
    const fresh: IdentityReflection = {
      id: 'ui-identity',
      anchors: idAnchors.trim(),
      gifts: idGifts.trim(),
      contribution: idContribution.trim(),
      lastUpdated: new Date().toLocaleDateString('pt-BR')
    };

    setIdentity(fresh);
    localStorage.setItem(`elo_identity_${emailKey}`, JSON.stringify(fresh));
    setIsEditingIdentity(false);
  };

  /* ------------------- FORGIVENESS RITUAL LOGIC ------------------- */
  const [forgiveStep, setForgiveStep] = useState<1 | 2 | 3>(1);
  const [forgiveTarget, setForgiveTarget] = useState<'self' | 'other'>('self');
  const [forgiveWhoText, setForgiveWhoText] = useState('');
  const [forgiveRancorText, setForgiveRancorText] = useState('');
  const [forgiveReasonText, setForgiveReasonText] = useState('');
  const [isForgiveReleasing, setIsForgiveReleasing] = useState(false);

  const [forgivenessHistory, setForgivenessHistory] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(`elo_forgiveness_${emailKey}`);
    if (saved) {
      try { setForgivenessHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, [emailKey]);

  const handleForgiveReleaseAction = () => {
    setIsForgiveReleasing(true);
    // Mimic deep intentional breathing cycle duration (4 seconds)
    setTimeout(() => {
      setIsForgiveReleasing(false);
      
      const freshRecord = {
        id: `fg-${Date.now()}`,
        date: new Date().toLocaleDateString('pt-BR'),
        target: forgiveTarget === 'self' ? 'Si mesmo' : (forgiveWhoText.trim() || 'Alguém especial'),
        releasing: forgiveRancorText.trim() || 'Mágoas e amarras invisíveis'
      };

      const next = [freshRecord, ...forgivenessHistory];
      setForgivenessHistory(next);
      localStorage.setItem(`elo_forgiveness_${emailKey}`, JSON.stringify(next));

      setForgiveStep(3);
    }, 4500);
  };

  const handleResetForgiveness = () => {
    setForgiveStep(1);
    setForgiveWhoText('');
    setForgiveRancorText('');
    setForgiveReasonText('');
  };

  const handleDeleteForgivenessRow = (id: string) => {
    const next = forgivenessHistory.filter(f => f.id !== id);
    setForgivenessHistory(next);
    localStorage.setItem(`elo_forgiveness_${emailKey}`, JSON.stringify(next));
  };


  /* ------------------- MIND EMPTY / BRAIN DRIP LOGIC ------------------- */
  const [drainInput, setDrainInput] = useState('');
  const [isDraining, setIsDraining] = useState(false);

  const handleDrainMind = () => {
    if (!drainInput.trim()) return;
    setIsDraining(true);
    // Smooth particle/fading interval
    setTimeout(() => {
      setDrainInput('');
      setIsDraining(false);
    }, 3800);
  };


  /* ------------------- ANALYTICS / EVOLUTION LOGIC ------------------- */
  // Calculate emotional metrics dynamically based on feelings
  const getFeelingStats = () => {
    const totals: { [key: string]: number } = {};
    entries.forEach(e => {
      // Extract emoji or name safely
      const raw = e.feeling || 'Neutro';
      const fName = raw.includes(' ') ? raw.split(' ').slice(0, -1).join(' ') : raw;
      totals[fName] = (totals[fName] || 0) + 1;
    });

    const list = Object.keys(totals).map(k => ({
      name: k,
      count: totals[k]
    }));

    // Sort by count
    return list.sort((a,b) => b.count - a.count);
  };

  const statsList = getFeelingStats();
  const totalTrackedFeelings = entries.length;
  // Compute basic streak of daily entries
  const entryStreak = entries.length > 0 ? Math.min(entries.length, 5) : 0; // Simulated active self-reflection count based on logs

  return (
    <div className="h-full bg-transparent flex flex-col overflow-y-auto pb-24">
      
      {/* 1. BRANDING HERO CONTAINER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-rose-950 text-white p-6 rounded-b-[2rem] shadow-sm relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-8 text-white/5 font-serif text-[120px] select-none pointer-events-none">
          ✨
        </div>

        <div className="max-w-2xl mx-auto space-y-4 relative">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[#fecdd3]">
            <Feather size={12} className="text-rose-300" />
            Recâmara de Autodescoberta
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-serif font-semibold tracking-tight">Caminho da Transformação</h2>
            <p className="text-xs text-rose-100/80 leading-relaxed max-w-lg">
              Um refúgio seguro para acolher sentimentos ruidosos, reordenar crenças, perdoar desvios e cultivar uma visão consciente do seu amanhã.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl w-full mx-auto px-4 md:px-0 mt-6 space-y-6 flex-1">
        
        {/* 2. SUB-TABS SELECTOR FOR INNER NAVIGATION */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none gap-1">
          <button
            onClick={() => setActiveTab('diary')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'diary' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Diário & Gratidão
          </button>
          <button
            onClick={() => { setActiveTab('exercises'); setExerciseMode('menu'); }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'exercises' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Exercícios de Cura
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'vision' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Mural de Sonhos
          </button>
          <button
            onClick={() => setActiveTab('drainage')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'drainage' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Drenar Ansiedade
          </button>
          <button
            onClick={() => setActiveTab('evolution')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'evolution' ? 'bg-white text-rose-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Evolução Emocional
          </button>
        </div>

        {/* -------------------- 3. ACTIVE VIEW TAB RENDERING -------------------- */}

        {/* TAB 3A: DIARIO EMOCIONAL & GRATIDAO */}
        {activeTab === 'diary' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Header / Add Button block */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-slate-800">Seu Livro de Vivências</h3>
                <p className="text-[11px] text-slate-400">Escreva livremente, sintonize emoções e proteja seu coração.</p>
              </div>
              {!isEditingEntry && (
                <button
                  onClick={() => setIsEditingEntry(true)}
                  className="bg-rose-500 hover:bg-rose-600 text-white py-2 px-4 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus size={14} /> Novo Log
                </button>
              )}
            </div>

            {/* Editing Panel (Custom Form) */}
            {isEditingEntry && (
              <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm space-y-4 animate-in slide-in-from-top-3 duration-350">
                <div className="flex items-center justify-between pb-2 border-b border-rose-50/50">
                  <div className="flex items-center gap-1">
                    <Feather size={14} className="text-rose-500" />
                    <span className="text-xs font-bold text-slate-700">Compondo Reflexão Íntima</span>
                  </div>
                  <button 
                    onClick={() => setIsEditingEntry(false)} 
                    className="text-slate-400 hover:text-slate-600"
                    title="Cancelar"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Feeling Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sua Sintonia neste instante:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {feelings.map(f => {
                      const isChosen = currentEntry.feeling === `${f.label} ${f.emoji}`;
                      return (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() => setCurrentEntry(prev => ({ ...prev, feeling: `${f.label} ${f.emoji}` }))}
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                            isChosen 
                              ? 'border-rose-350 bg-rose-50 text-rose-700 scale-[1.02] shadow-sm font-semibold' 
                              : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200'
                          }`}
                        >
                          <span className="text-base">{f.emoji}</span>
                          <span className="truncate">{f.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Thought content area */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fluxo livre de consciência:</label>
                  <textarea
                    value={currentEntry.content}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Sem amarras, sem julgamentos. Como se sente? Descreva seus pensamentos e o ritmo do seu dia..."
                    rows={5}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-1 focus:ring-rose-300 focus:bg-white outline-none transition-all leading-relaxed"
                  />
                </div>

                {/* Elegant dynamic gratitude prompt tool */}
                <div className="bg-rose-50/35 border border-rose-100/70 p-4 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-1.5">
                      <Heart size={13} className="text-rose-400" fill="currentColor" />
                      <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">Clarão de Gratidão Consciente</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedPromptIndex((selectedPromptIndex + 1) % GRATITUDE_PROMPTS.length)}
                      className="text-[9px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <RotateCcw size={10} /> Mudar Pergunta
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-normal italic font-serif">
                    "{GRATITUDE_PROMPTS[selectedPromptIndex]}"
                  </p>

                  <input
                    type="text"
                    value={currentEntry.gratitude}
                    onChange={(e) => setCurrentEntry(prev => ({ ...prev, gratitude: e.target.value }))}
                    placeholder="Escreva aqui esta pequena ou grande vitória..."
                    className="w-full p-3 bg-white border border-rose-100/70 rounded-xl text-xs focus:ring-1 focus:ring-rose-300 outline-none transition-all"
                  />
                </div>

                {/* Actions bottom */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={handleSaveEntry}
                    className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 text-white py-3 rounded-xl font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> Fixar Reflexão no Tempo
                  </button>
                  <button
                    onClick={() => setIsEditingEntry(false)}
                    className="px-4 bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors flex items-center justify-center"
                    title="Cancelar"
                  >
                    Recuar
                  </button>
                </div>
              </div>
            )}

            {/* List entries */}
            <div className="space-y-4">
              {entries.length === 0 && !isEditingEntry ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-4">
                  <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                    <Feather size={22} />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <p className="text-xs font-bold text-slate-700">Nenhum registro no diário ainda</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Transforme vivências íntimas em medicina emocional. Clique em "Novo Log" para começar um diário natural e sem amarras.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingEntry(true)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] uppercase py-2.5 px-5 rounded-xl transition-all inline-block"
                  >
                    Começar Meu Diário
                  </button>
                </div>
              ) : (
                entries.map((entry) => {
                  const currentFeelingObj = feelings.find(f => entry.feeling.includes(f.label));
                  
                  return (
                    <div 
                      key={entry.id} 
                      className="bg-white p-5 rounded-3xl border border-slate-100/70 shadow-2xs relative group overflow-hidden transition-all hover:border-slate-200/50"
                    >
                      <div className="flex items-start justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <span className="p-1 px-2.2 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg flex items-center gap-1">
                            <Calendar size={11} />
                            <span className="text-[9.5px] font-bold uppercase tracking-widest">{entry.date}</span>
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-slate-200 hover:text-rose-500 p-1 transition-all rounded-lg hover:bg-rose-50"
                          title="Excluir Registro"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Feeling pill index */}
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold mb-3 border ${
                        currentFeelingObj?.color || 'text-slate-650 bg-slate-50 border-slate-100'
                      }`}>
                        <span>{currentFeelingObj?.emoji || '🧘'}</span>
                        <span>{entry.feeling}</span>
                      </span>

                      <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap mb-4">
                        {entry.content}
                      </div>

                      {entry.gratitude && (
                        <div className="bg-rose-50/25 border border-rose-100/40 p-3.5 rounded-2xl flex items-start gap-2.5">
                          <Heart size={13} className="text-rose-400 mt-0.5" fill="currentColor" />
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-extrabold text-[#f43f5e] uppercase tracking-wider">Apreciação Sincera</span>
                            <p className="text-xs text-rose-850 italic font-serif leading-normal">
                              "{entry.gratitude}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3B: INTERACTIVE COGNITIVE EXERCISES */}
        {activeTab === 'exercises' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* SUB ROUTING INSIDE EXERCISES */}
            {exerciseMode === 'menu' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-semibold text-slate-800">Exercícios de inteligência Emocional</h3>
                  <p className="text-[11px] text-slate-400">Práticas de introspecção desenhadas para libertar amarras mentais de maneira natural.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1: Beliefs */}
                  <button
                    onClick={() => setExerciseMode('beliefs')}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col items-start gap-3.5 text-left transition-all hover:scale-[1.01] hover:shadow-xs group hover:border-rose-100"
                  >
                    <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                      <HelpCircle size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-700 group-hover:text-rose-600 transition-colors">Reprogramação de Crenças</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">Identifique distorções mentais exaustivas e construa âncoras firmes de verdade.</p>
                    </div>
                    <span className="text-[10px] mt-auto font-bold text-rose-500 flex items-center gap-0.5">
                      Abrir Prática <ChevronRight size={12} />
                    </span>
                  </button>

                  {/* Card 2: Forgiveness */}
                  <button
                    onClick={() => { setExerciseMode('forgiveness'); handleResetForgiveness(); }}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col items-start gap-3.5 text-left transition-all hover:scale-[1.01] hover:shadow-xs group hover:border-rose-100"
                  >
                    <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                      <PeaceIcon size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-700 group-hover:text-rose-600 transition-colors">Exercício do Perdão</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">Solte fardos invisíveis, cure amarguras acumuladas e acolha o seu processo com compaixão.</p>
                    </div>
                    <span className="text-[10px] mt-auto font-bold text-rose-500 flex items-center gap-0.5">
                      Abrir Prática <ChevronRight size={12} />
                    </span>
                  </button>

                  {/* Card 3: Identity & Purpose */}
                  <button
                    onClick={() => setExerciseMode('identity')}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col items-start gap-3.5 text-left transition-all hover:scale-[1.01] hover:shadow-xs group hover:border-rose-100"
                  >
                    <div className="w-10 h-10 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center">
                      <Compass size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-700 group-hover:text-rose-600 transition-colors">Identidade & Propósito</h4>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">Reflita com calma sobre seus dons livres, âncoras vitais e sua contribuição intencional ao mundo.</p>
                    </div>
                    <span className="text-[10px] mt-auto font-bold text-rose-500 flex items-center gap-0.5">
                      Abrir Prática <ChevronRight size={12} />
                    </span>
                  </button>
                </div>

                {/* Calming Quote footer */}
                <div className="bg-slate-900 text-white/95 p-5 rounded-3xl border border-slate-800 space-y-2.5 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 translate-y-4 translate-x-4 opacity-10 font-[serif] text-[80px]">🍵</div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#fda4af]">Cuidado Delicado</span>
                  <p className="text-xs italic leading-relaxed font-serif text-rose-100/90 max-w-md">
                    "O sofrimento emocional quase sempre floresce de histórias rígidas que contamos a nós mesmos. Desatar esses nós não requer força, e sim um desanuviar carinhoso de autocompreensão."
                  </p>
                </div>
              </div>
            )}

            {/* EXERCISE MODULE: BELIEFS REPROGRAMMING */}
            {exerciseMode === 'beliefs' && (
              <div className="space-y-4 animate-in fade-in duration-250">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExerciseMode('menu')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    ← Voltar aos Exercícios
                  </button>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">Foco: Crenças Limitantes</span>
                </div>

                {/* Form to reprogram belief */}
                {!showBeliefForm ? (
                  <button
                    onClick={() => setShowBeliefForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 border border-dashed border-slate-200 hover:border-amber-400 rounded-2xl text-xs font-bold text-slate-500 hover:text-amber-500 bg-white hover:bg-amber-50/10 transition-all"
                  >
                    + Questionar Crença Limitante
                  </button>
                ) : (
                  <form onSubmit={handleAddBelief} className="bg-white border border-amber-100 p-5 rounded-3xl space-y-4 text-left animate-in slide-in-from-top-3 duration-300">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">Desatar Nó da Mente</span>
                      <button type="button" onClick={() => setShowBeliefForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Qual história ou julgamento rígido está rodando na sua cabeça?</label>
                      <textarea
                        required
                        rows={2}
                        value={beliefOriginal}
                        onChange={(e) => setBeliefOriginal(e.target.value)}
                        placeholder="Ex: 'Sinto que se eu falhar nesta meta, serei uma decepção incurável para as pessoas.'"
                        className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-400 outline-none focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Qual Viés do Pensamento você detecta aqui?</label>
                      <select
                        value={beliefDistortion}
                        onChange={(e) => setBeliefDistortion(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:ring-1 focus:ring-amber-400"
                      >
                        {COGNITIVE_DISTORTIONS.map(d => (
                          <option key={d.id} value={d.title}>{d.title} — ({d.desc.slice(0, 45)}...)</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Verdade consciente (Como reescrever isso sob clareza mansa?)</label>
                      <textarea
                        required
                        rows={2}
                        value={beliefLiberating}
                        onChange={(e) => setBeliefLiberating(e.target.value)}
                        placeholder="Ex: 'Falhar é um evento instrutivo do percurso longo, e não a definição do meu valor permanente.'"
                        className="w-full bg-slate-50 border border-slate-250 p-3 rounded-xl text-xs focus:ring-1 focus:ring-amber-400 outline-none focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-widest shadow-xs transition-colors"
                    >
                      Converter em Âncora de Verdade
                    </button>
                  </form>
                )}

                {/* List beliefs */}
                <div className="space-y-3">
                  {beliefs.map(b => (
                    <div key={b.id} className="bg-white p-5 rounded-3xl border border-slate-100 space-y-3.5 relative shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Integrado em {b.date}</span>
                        <button onClick={() => handleDeleteBelief(b.id)} className="text-slate-300 hover:text-rose-500 p-1 rounded hover:bg-rose-50" title="Excluir">
                          <Trash size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 space-y-1 text-left">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">❌ Perspectiva Rígida</span>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans italic">"{b.original}"</p>
                          <span className="text-[8px] font-extrabold text-amber-600 uppercase tracking-wider block pt-1">Erro: {b.distortion}</span>
                        </div>

                        <div className="bg-amber-50/20 p-3 rounded-2xl border border-amber-100/40 space-y-1 text-left">
                          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">✨ Âncora de Verdade</span>
                          <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">"{b.liberating}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EXERCISE MODULE: GUIDED FORGIVENESS RITUAL */}
            {exerciseMode === 'forgiveness' && (
              <div className="space-y-4 animate-in fade-in duration-250">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExerciseMode('menu')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    ← Voltar aos Exercícios
                  </button>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">Rito de Desapego & Perdão</span>
                </div>

                {/* Steps controller */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 space-y-5 shadow-3xs">
                  
                  {/* Step Indicators */}
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-rose-50/30">
                    <span className={`text-xs font-bold ${forgiveStep >= 1 ? 'text-rose-500' : 'text-slate-300'}`}>1. Sondar a Mágoa</span>
                    <span className="text-slate-200">/</span>
                    <span className={`text-xs font-bold ${forgiveStep >= 2 ? 'text-rose-500' : 'text-slate-300'}`}>2. Rito de Liberação</span>
                    <span className="text-slate-200">/</span>
                    <span className={`text-xs font-bold ${forgiveStep >= 3 ? 'text-rose-500' : 'text-slate-300'}`}>3. Paz Selada</span>
                  </div>

                  {forgiveStep === 1 && (
                    <div className="space-y-4 text-left animate-in fade-in duration-300">
                      <p className="text-xs text-slate-500 leading-relaxed italic">
                        "O perdão real ou o auto-perdão não apaga o que aconteceu, nem valida o comportamento alheio. É simplesmente a decisão consciente de retirar o veneno antigo do seu sangue. É não permitir mais que o passado determine a temperatura da sua alma."
                      </p>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quem ou o que sua alma deseja libertar hoje?</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setForgiveTarget('self')}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs transition-all ${forgiveTarget === 'self' ? 'border-rose-300 bg-rose-50/40 text-rose-600 font-bold' : 'bg-slate-50 text-slate-500'}`}
                          >
                            Si mesmo (Acolher falhas do passado)
                          </button>
                          <button
                            type="button"
                            onClick={() => setForgiveTarget('other')}
                            className={`flex-1 py-2 px-3 rounded-xl border text-xs transition-all ${forgiveTarget === 'other' ? 'border-rose-300 bg-rose-50/40 text-rose-600 font-bold' : 'bg-slate-50 text-slate-500'}`}
                          >
                            Outra pessoa (Liberar amargura externa)
                          </button>
                        </div>
                      </div>

                      {forgiveTarget === 'other' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome ou lembrança de quem deseja perdoar:</label>
                          <input
                            type="text"
                            value={forgiveWhoText}
                            onChange={(e) => setForgiveWhoText(e.target.value)}
                            placeholder="Ex: Alguém que me julgou injustamente..."
                            className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl focus:ring-1 focus:ring-rose-300 outline-none focus:bg-white"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Qual fardo, palavra, cobrança ou ressentimento você deseja soltar?</label>
                        <textarea
                          rows={3}
                          value={forgiveRancorText}
                          onChange={(e) => setForgiveRancorText(e.target.value)}
                          placeholder="Ex: 'O ressentimento por não ter agido no momento certo' ou 'A raiva persistente por aquela ofensa silenciosa'."
                          className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl focus:ring-1 focus:ring-rose-300 outline-none focus:bg-white"
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (forgiveRancorText.trim()) {
                            setForgiveStep(2);
                          }
                        }}
                        disabled={!forgiveRancorText.trim()}
                        className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl uppercase tracking-widest transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        Avançar ao Rito de Liberação <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {forgiveStep === 2 && (
                    <div className="space-y-4 text-center py-4 animate-in fade-in duration-300">
                      <AnimatePresence mode="wait">
                        {!isForgiveReleasing ? (
                          <div className="space-y-4">
                            <div className="max-w-xs mx-auto text-slate-500 text-xs leading-relaxed space-y-2">
                              <p className="font-serif italic font-bold text-rose-600">"Respire hondo e apoie as mãos em seu peito."</p>
                              <p>
                                Você está prestes a deixar ir esta amarra: 
                                <br />
                                <strong className="text-slate-800">"{forgiveRancorText}"</strong>
                              </p>
                              <p>
                                Selecione expirar devagar ao clicar no botão. O aplicativo guiará um intervalo de respiração de desapego.
                              </p>
                            </div>

                            <button
                              onClick={handleForgiveReleaseAction}
                              className="bg-gradient-to-r from-teal-500 to-rose-500 text-white font-bold text-xs px-6 py-3.5 rounded-full uppercase tracking-wider shadow-sm transition-all inline-block hover:scale-102"
                            >
                              Soltar e Respirar no Vazio
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-6 py-6 flex flex-col items-center">
                            {/* Calming visual ripple loader */}
                            <div className="relative w-20 h-20 flex items-center justify-center">
                              <span className="absolute inset-0 rounded-full bg-rose-400 opacity-20 animate-ping"></span>
                              <span className="absolute inset-2 rounded-full bg-rose-505 opacity-10 animate-pulse"></span>
                              <div className="w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
                                🧘
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-sm font-bold text-teal-600 animate-pulse">Expirando e Dissolvendo fardos antigos...</p>
                              <p className="text-[10px] text-slate-400">Pressione levemente o ar para fora e sinta o peito amansar.</p>
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {forgiveStep === 3 && (
                    <div className="space-y-4 text-center py-3 animate-in fade-in duration-300">
                      <div className="w-12 h-12 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mx-auto text-lg">
                        ✓
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-800">Pacto de Desapego Selado</h4>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          As palavras e expectativas antigas foram confiadas ao vazio. Se a mágoa voltar a sussurrar nos dias seguintes, lembre seu espírito: "Isto já foi solto; eu escolho viver no presente."
                        </p>
                      </div>

                      <button
                        onClick={handleResetForgiveness}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] uppercase py-2 px-5 rounded-xl transition-all inline-block"
                      >
                        Iniciar Outra Prática de Perdão
                      </button>
                    </div>
                  )}
                </div>

                {/* Log of recorded Releases */}
                {forgivenessHistory.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3 shadow-3xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Registro Histórico de Pactos de Paz</span>
                    <div className="space-y-2.5">
                      {forgivenessHistory.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100/70 rounded-2xl text-left">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-700">Libertado com relação a: {item.target}</p>
                            <p className="text-[10.5px] text-slate-400 italic">"Pacto feito para soltar: {item.releasing}"</p>
                            <span className="text-[8px] text-teal-600 font-bold uppercase block tracking-wider mt-0.5">Sabor de liberdade • {item.date}</span>
                          </div>
                          <button onClick={() => handleDeleteForgivenessRow(item.id)} className="text-slate-300 hover:text-rose-500 p-1 rounded hover:bg-rose-50">
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EXERCISE MODULE: IDENTITY & PURPOSE REFLECTION */}
            {exerciseMode === 'identity' && (
              <div className="space-y-4 animate-in fade-in duration-250">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setExerciseMode('menu')}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    ← Voltar aos Exercícios
                  </button>
                  <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg">Foco: Sentido & Identidade</span>
                </div>

                {/* Form or Read layout */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 space-y-4 shadow-3xs text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-sky-50/40">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">Suas Âncoras de Sentido</h4>
                      <p className="text-[9.5px] text-slate-400">Respostas calmas e refletidas sobre quem você é de verdade.</p>
                    </div>
                    {!isEditingIdentity && identity && (
                      <button
                        onClick={() => setIsEditingIdentity(true)}
                        className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg"
                      >
                        Reescrever
                      </button>
                    )}
                  </div>

                  {!identity && !isEditingIdentity ? (
                    <div className="text-center py-6 space-y-3">
                      <p className="text-[11px] text-slate-400 italic">Você ainda não catalogou suas âncoras identitárias.</p>
                      <button
                        onClick={() => setIsEditingIdentity(true)}
                        className="bg-sky-50 hover:bg-sky-102 text-sky-600 font-bold text-[10px] uppercase py-2 px-4 rounded-xl transition-all"
                      >
                        Definir Meus Pilares
                      </button>
                    </div>
                  ) : isEditingIdentity ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. As Âncoras: O que me acalma e mantém firme quando tudo balança?</label>
                        <textarea
                          rows={2}
                          value={idAnchors}
                          onChange={(e) => setIdAnchors(e.target.value)}
                          placeholder="Ex: 'Ter tempo de silêncio pela manhã, lembrar do amor incondicional da minha família e respirar devagar.'"
                          className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl focus:ring-1 focus:ring-sky-300 outline-none focus:bg-white leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. Os Dons Livres: O que eu ofereço naturalmente ao mundo sem cansaço?</label>
                        <textarea
                          rows={2}
                          value={idGifts}
                          onChange={(e) => setIdGifts(e.target.value)}
                          placeholder="Ex: 'Saber ouvir desabafos sem julgar rapidamente, trazer ordem para pensamentos confusos e ser paciente na discórdia.'"
                          className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl focus:ring-1 focus:ring-sky-300 outline-none focus:bg-white leading-relaxed"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">3. Contribuição Intencional: Como desejo influenciar positivamente meu entorno hoje?</label>
                        <textarea
                          rows={2}
                          value={idContribution}
                          onChange={(e) => setIdContribution(e.target.value)}
                          placeholder="Ex: 'Cuidando das minhas reações para não descarregar estresse doméstico, ajudando idosos com gestos acolhedores.'"
                          className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl focus:ring-1 focus:ring-sky-300 outline-none focus:bg-white leading-relaxed"
                        />
                      </div>

                      <div className="flex gap-2.5 pt-1">
                        <button
                          onClick={handleSaveIdentity}
                          className="flex-1 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-widest shadow-sm transition-colors"
                        >
                          Selar Identidade
                        </button>
                        <button
                          onClick={() => setIsEditingIdentity(false)}
                          className="px-4 bg-slate-100 text-slate-500 py-2.5 rounded-xl text-xs font-bold"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/70 text-left">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">⚓ MINHAS ÂNCORAS FORTES</span>
                        <p className="text-xs text-slate-705 mt-1 leading-relaxed font-sans font-medium">{identity?.anchors}</p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/70 text-left">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">🎁 DONS NATURAIS LIVRES</span>
                        <p className="text-xs text-slate-705 mt-1 leading-relaxed font-sans font-medium">{identity?.gifts}</p>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/70 text-left">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">🌱 MINHA CONTRIBUÍÇÃO INTENCIONAL</span>
                        <p className="text-xs text-slate-705 mt-1 leading-relaxed font-sans font-medium">{identity?.contribution}</p>
                      </div>

                      <span className="text-[8px] text-slate-300 uppercase tracking-widest text-center block pt-1">Última sintonização: {identity?.lastUpdated}</span>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3C: VISION BOARD & DREAMS (MURAL DE SONHOS) */}
        {activeTab === 'vision' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-slate-800">Mural de Visualização Integral</h3>
                <p className="text-[11px] text-slate-400">Projete suas aspirações conscientes e separe-as em micropassos gentis.</p>
              </div>
              {!showDreamForm && (
                <button
                  onClick={() => setShowDreamForm(true)}
                  className="bg-rose-500 hover:bg-rose-600 text-white py-1.5 px-3 rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  Adicionar Sonho
                </button>
              )}
            </div>

            {/* Custom Form Add Dream */}
            {showDreamForm && (
              <form onSubmit={handleCreateDream} className="bg-white border border-rose-100 p-5 rounded-3xl space-y-4 text-left animate-in slide-in-from-top-3 duration-300">
                <div className="flex items-center justify-between pb-1 border-b border-rose-50/20">
                  <span className="text-[10px] font-bold text-rose-505 uppercase tracking-widest">Nova Aspiração Consciente</span>
                  <button type="button" onClick={() => setShowDreamForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Voltar</button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emoji Símbolo</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={newDreamEmoji}
                      required
                      onChange={(e) => setNewDreamEmoji(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-2.5 text-center text-sm rounded-xl"
                      placeholder="✨"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Qual o título da aspiração?</label>
                    <input
                      type="text"
                      required
                      value={newDreamTitle}
                      onChange={(e) => setNewDreamTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 py-2 px-3 text-xs rounded-xl focus:ring-1 focus:ring-rose-300 outline-none focus:bg-white"
                      placeholder="Ex: Harmonizar Repouso e Sono Profundo"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Qual a grande motivação da alma por trás do sonho? (Propósito)</label>
                  <textarea
                    rows={2}
                    required
                    value={newDreamPurpose}
                    onChange={(e) => setNewDreamPurpose(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl focus:ring-1 focus:ring-rose-300 outline-none focus:bg-white"
                    placeholder="Ex: 'Sentir vigor natural ao nascer do dia, reduzindo a necessidade de ruídos digitais exaustivos.'"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pb-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoria Humana</label>
                    <select
                      value={newDreamCategory}
                      onChange={(e: any) => setNewDreamCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 text-xs rounded-xl focus:ring-1"
                    >
                      <option value="alma">Alma & Equilíbrio Interno</option>
                      <option value="saude">Saúde Inteira & Vigor</option>
                      <option value="criativo">Criação & Lazer Leve</option>
                      <option value="relacional">Convivência & Parentalidade</option>
                      <option value="carreira">Carreira Conciliada</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fixar Próximos Passos</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newDreamStepText}
                        onChange={(e) => setNewDreamStepText(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 px-2 py-1 text-xs rounded-xl focus:ring-1 focus:ring-rose-300"
                        placeholder="Ex: Dormir às 22h"
                      />
                      <button
                        type="button"
                        onClick={handleAddTempStep}
                        className="bg-slate-200 hover:bg-slate-300 px-3.5 py-1 text-xs font-bold rounded-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show current added list */}
                {tempSteps.length > 0 && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-505 space-y-1">
                    <p className="font-bold text-[9px] uppercase tracking-widest text-slate-400">Checklist temporário adicionado:</p>
                    {tempSteps.map((s, idx) => (
                      <p key={idx}>• {s}</p>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-widest shadow-xs transition-colors"
                >
                  Registrar Sonho e Micropassos no Mural
                </button>
              </form>
            )}

            {/* Render Dreams List (Bento-style Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dreams.map(dream => {
                const totalSteps = dream.steps.length;
                const doneSteps = dream.steps.filter(s => s.completed).length;
                const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

                return (
                  <div key={dream.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs hover:border-rose-100/50 transition-all flex flex-col justify-between text-left">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-xl select-none">
                          {dream.emoji}
                        </span>
                        
                        <div className="flex gap-2">
                          <span className="text-[8px] font-bold uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-100 p-1 px-2 rounded">
                            {dream.category === 'alma' ? 'Âncora Alma' : dream.category === 'saude' ? 'Saúde Única' : 'Progresso Leve'}
                          </span>
                          <button onClick={() => handleDeleteDream(dream.id)} className="text-slate-200 hover:text-rose-500 p-0.5 rounded" title="Excluir">
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-serif text-sm font-semibold text-slate-800 leading-snug">{dream.title}</h4>
                        <p className="text-[10.5px] text-slate-400 leading-normal italic font-serif">"Porquê: {dream.purpose}"</p>
                      </div>

                      {/* Steps Checklist inside Dream */}
                      {dream.steps.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-50">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Passos de Autocompaixão</span>
                          {dream.steps.map(step => (
                            <button
                              key={step.id}
                              type="button"
                              onClick={() => handleToggleDreamStep(dream.id, step.id)}
                              className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50/40 text-left transition-all"
                            >
                              <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${step.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-white'}`}>
                                {step.completed && <span className="text-[9px] font-extrabold">✓</span>}
                              </span>
                              <span className={`text-[11px] font-medium leading-tight truncate ${step.completed ? 'line-through text-slate-300' : 'text-slate-600'}`}>{step.text}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 mt-4 border-t border-slate-50 space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-extrabold text-[#f43f5e] uppercase">
                        <span>Aproximação Consciente</span>
                        <span>{progressPct}% Conquistado</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#f43f5e] h-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3D: DRENAGEM DE EXCESSO E ANSIEDADE (MENT MIND CANVASES) */}
        {activeTab === 'drainage' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            <div className="bg-white p-5 rounded-3xl border border-rose-100/40 text-left space-y-3 shadow-3xs">
              <div className="flex items-center gap-1.5">
                <CloudLightning size={16} className="text-rose-500 animate-pulse" />
                <h4 className="font-serif text-sm font-semibold text-slate-800">Drenagem de Ruídos Mentais</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                “Muitas vezes, a ansiedade reside na tentativa fútil de controlar pensamentos que deveriam passar livres como nuvens. Use esta área para despejar livremente tudo o que estiver cobrando atenção ou causando medo, e depois libere as palavras ao vazio permanente.”
              </p>
            </div>

            {/* Drain Arena Canvas */}
            <div className="bg-slate-900 text-white rounded-[2rem] p-6 text-center space-y-4 relative overflow-hidden shadow-md">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#fecdd3] bg-white/10 px-3 py-1 rounded-full inline-block">Espaço de Esvaziamento</span>

              <div className="relative">
                <AnimatePresence>
                  {!isDraining ? (
                    <textarea
                      value={drainInput}
                      onChange={(e) => setDrainInput(e.target.value)}
                      disabled={isDraining}
                      rows={6}
                      placeholder="Despeje as ansiedades, as preocupações da noite, os loops obsessivos aqui... Coloque as palavras para fora."
                      className="w-full bg-slate-850/50 text-[#fff1f2] p-4 text-xs font-serif leading-relaxed rounded-2xl border border-slate-800 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none transition-all duration-1000"
                    />
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center space-y-4 text-rose-100/90 py-6">
                      <div className="w-14 h-14 rounded-full border border-rose-400/30 flex items-center justify-center animate-pulse">
                        <span className="text-xl animate-spin inline-block">🍃</span>
                      </div>
                      <div className="space-y-1 max-w-xs mx-auto">
                        <p className="text-xs font-bold text-teal-300 italic animate-pulse">Desintegrando ruídos e limpando excessos...</p>
                        <p className="text-[10px] text-rose-100/40 leading-relaxed font-sans">
                          Acolha o ar limpo. Os pensamentos e palavras digitados foram desfeitos e devolvidos ao silêncio natural.
                        </p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {!isDraining && (
                <div className="flex justify-center pt-2 gap-2">
                  <button
                    onClick={handleDrainMind}
                    disabled={!drainInput.trim()}
                    className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold py-3 px-6 rounded-full uppercase tracking-wider shadow-sm transition-all hover:scale-102"
                  >
                    Dissipar Ansiedade e Esvaziar o Peito
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3E: EVOLUCAO EMOCIONAL / INSIGHTS DASHBOARD */}
        {activeTab === 'evolution' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-semibold text-slate-800">Evolução do Equilíbrio</h3>
              <p className="text-[11px] text-slate-400">Dados sintonizados matematicamente a partir dos seus sentimentos e auto-reflexões.</p>
            </div>

            {/* Stat indicators card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100/80 text-center space-y-1.5 shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Consistência Introspectiva</span>
                <p className="text-xl font-mono font-bold text-rose-600">{entries.length} registros</p>
                <span className="text-[9.5px] text-slate-400 leading-none">Catalogados no diário ativo</span>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-100/80 text-center space-y-1.5 shadow-3xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Índice de Auto-observação</span>
                <p className="text-xl font-mono font-bold text-rose-600">Nível {entryStreak}</p>
                <span className="text-[9.5px] text-slate-400 leading-none">Práticas seguidas recentemente</span>
              </div>
            </div>

            {/* Feel Index Dynamic SVG Chart (Custom visual design pattern) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100/90 shadow-3xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <div className="flex items-center gap-1.5">
                  <Activity size={15} className="text-rose-500" />
                  <span className="text-xs font-extrabold text-slate-705">Sua Frequência de Sentimentos</span>
                </div>
                <span className="text-[9px] text-[#f43f5e] font-extrabold uppercase">Últimos {entries.length} logs</span>
              </div>

              {statsList.length > 0 ? (
                <div className="space-y-3.5">
                  {statsList.map((stat, idx) => {
                    const pctValue = totalTrackedFeelings > 0 ? Math.round((stat.count / totalTrackedFeelings) * 100) : 0;
                    
                    return (
                      <div key={idx} className="space-y-1 text-left">
                        <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                          <span>{stat.name}</span>
                          <span className="font-mono text-xs">{pctValue}% ({stat.count}x)</span>
                        </div>
                        <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100/60">
                          <div 
                            className="bg-[#fecdd3] h-full transition-all duration-500" 
                            style={{ 
                              width: `${pctValue}%`, 
                              backgroundColor: idx === 0 ? '#f43f5e' : idx === 1 ? '#fda4af' : '#ffe4e6' 
                            }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-slate-400 italic">Preencha o seu Diário para gerar informações sobre o seu bem-estar.</p>
                </div>
              )}
            </div>

            {/* Empathetic Insights Counselor */}
            <div className="bg-rose-50/20 border border-thin border-rose-100 p-5 rounded-3xl text-left space-y-3 select-none">
              <div className="flex items-center gap-1">
                <Sparkles size={14} className="text-rose-500" strokeWidth={2.5} />
                <span className="text-[10px] font-bold text-[#f43f5e] uppercase tracking-widest">Sussurro de Orientação Prática</span>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed font-sans space-y-2">
                {statsList.length === 0 ? (
                  <p className="italic">
                    "O Elo está aguardando suas auto-reflexões diárias sob o diário para identificar padrões latentes e ajudá-lo a equilibrar a mandíbula, relaxar os ombros e focar na constância pacífica."
                  </p>
                ) : statsList[0].name.includes('Inquieto') ? (
                  <p className="italic">
                    "Identificamos ondas recentes de inquietação mental. Isso geralmente significa cansaço sensorial acumulado. Recomendamos um jejum voluntário de notícias por 2 dias e pausas intencionais de 2 minutos para desarmar cobranças desnecessárias."
                  </p>
                ) : (
                  <p className="italic">
                    "Você tem mantido um excelente alinhamento com seu presente. Seus pensamentos refletem clareza e acolhimento interno. Continue sustentando o seu pacto de silêncio matinal e exercitando micropassos no mural de sonhos."
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default DiaryView;
