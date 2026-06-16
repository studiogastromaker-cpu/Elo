import React, { useState, useEffect, useRef } from 'react';
import { UserSession, DiagnosticResult, DiagnosticArea } from '../types';
import { LIBRARY_CONTENTS, LEARNING_TRILHAS, ContentItem, LearningTrilha, ContentType } from '../libraryData';
import { 
  Play, Pause, BookOpen, Video, Heart, CheckCircle2, Circle, Search, 
  ChevronRight, Volume2, Sparkles, BookHeart, Compass, Eye, Edit3, 
  ArrowLeft, RotateCcw, ZoomIn, ZoomOut, Bookmark, Check, Calendar, HelpCircle
} from 'lucide-react';

interface LibraryViewProps {
  session: UserSession;
}

const CATEGORIES_INFO: { id: string; label: string; icon: string; bg: string; text: string }[] = [
  { id: 'all', label: 'Tudo', icon: '✨', bg: 'bg-slate-100', text: 'text-slate-700' },
  { id: 'ansiedade', label: 'Ansiedade', icon: '🍃', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { id: 'paz', label: 'Paz Interior', icon: '🕊️', bg: 'bg-sky-50', text: 'text-sky-700' },
  { id: 'proposito', label: 'Propósito', icon: '🎯', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  { id: 'autoestima', label: 'Autoestima', icon: '🌸', bg: 'bg-rose-50', text: 'text-rose-700' },
  { id: 'disciplina', label: 'Disciplina', icon: '⏳', bg: 'bg-amber-50', text: 'text-amber-700' },
  { id: 'perdao', label: 'Perdão', icon: '🤝', bg: 'bg-violet-50', text: 'text-violet-700' },
  { id: 'relacionamentos', label: 'Relações', icon: '🫂', bg: 'bg-teal-50', text: 'text-teal-700' },
  { id: 'identidade', label: 'Identidade', icon: '🛡️', bg: 'bg-blue-50', text: 'text-blue-700' }
];

export const LibraryView: React.FC<LibraryViewProps> = ({ session }) => {
  // Navigation / Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'trilhas' | 'favorites'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Detail selection
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [selectedTrilha, setSelectedTrilha] = useState<LearningTrilha | null>(null);
  
  // Interactive Preferences / Progress (per user email)
  const [favorites, setFavorites] = useState<string[]>([]);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [userInsights, setUserInsights] = useState<{ [itemId: string]: string }>({});
  const [activeInsightText, setActiveInsightText] = useState('');
  
  // Auto recommendation
  const [smartRecTheme, setSmartRecTheme] = useState<{ title: string; category: string; description: string } | null>(null);

  // Audio Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackVolume, setPlaybackVolume] = useState(0.8);

  // Text reader state
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Video playback control states
  const [videoIsPlaying, setVideoIsPlaying] = useState(false);
  const [videoSubtitles, setVideoSubtitles] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const email = session.email;
    
    const storedFavs = localStorage.getItem(`elo_favs_${email}`);
    if (storedFavs) setFavorites(JSON.parse(storedFavs));
    
    const storedCompleted = localStorage.getItem(`elo_progress_${email}`);
    if (storedCompleted) setCompletedItems(JSON.parse(storedCompleted));

    const storedInsights = localStorage.getItem(`elo_insights_${email}`);
    if (storedInsights) {
      try {
        setUserInsights(JSON.parse(storedInsights));
      } catch (e) {
        console.error('Error loading insights', e);
      }
    }

    // Build smart recommendations based on latest diagnostic test scores if available
    const rawDiagnostics = localStorage.getItem(`elo_diagnostics_${email}`);
    if (rawDiagnostics) {
      try {
        const diagnostics: DiagnosticResult[] = JSON.parse(rawDiagnostics);
        if (diagnostics.length > 0) {
          const latest = diagnostics[0];
          // Find lowest score
          let minScore = 11;
          let minArea: string = 'emocional';
          
          (Object.keys(latest.scores) as DiagnosticArea[]).forEach(area => {
            const val = latest.scores[area];
            if (val < minScore) {
              minScore = val;
              minArea = area;
            }
          });

          // Map diagnostic area to library category
          let mappedCategory = 'ansiedade';
          let mappedThemeName = 'Cuidado Emocional';
          let rationale = 'Identificamos que você avaliou recentemente o seu Equilíbrio Emocional com maior necessidade de atenção. Sugerimos focar em calma para desfazer pressões.';

          if (minArea === 'espiritual') {
            mappedCategory = 'paz';
            mappedThemeName = 'Espiritualidade & Paz';
            rationale = 'Sua conexão interior pede momentos de paz e contemplação. Respire e desfrute destes ensaios e podcasts.';
          } else if (minArea === 'relacionamentos' || minArea === 'familia') {
            mappedCategory = 'perdao';
            mappedThemeName = 'Relações & Perdão';
            rationale = 'Para aliviar as tensões nas convivências, recomendamos trilhas que exercitam ouvir pacientemente.';
          } else if (minArea === 'equilibrio' || minArea === 'saude') {
            mappedCategory = 'ansiedade';
            mappedThemeName = 'Equilíbrio Integral';
            rationale = 'Desacelere o ritmo das exigências. Pratique a respiração e abrace a simplicidade de fazer menos hoje.';
          } else if (minArea === 'produtividade' || minArea === 'habitos' || minArea === 'financeiro') {
            mappedCategory = 'disciplina';
            mappedThemeName = 'Foco & Disciplina';
            rationale = 'Boas atitudes e constância se estruturam de passos simples. Aproveite estas orientações com foco mansa.';
          } else if (minArea === 'proposito' || minArea === 'mentalidade') {
            mappedCategory = 'proposito';
            mappedThemeName = 'Propósito & Rumo';
            rationale = 'Renove seu entendimento sobre sua identidade ímpar no universo através destes ensinamentos.';
          }

          setSmartRecTheme({
            title: mappedThemeName,
            category: mappedCategory,
            description: rationale
          });
        }
      } catch (e) {
        console.error('Error calculating diagnostic recommendations', e);
      }
    }
  }, [session]);

  // Clean up audio on unmount or item change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [selectedItem]);

  // Handle Favorite Action
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = favorites.includes(id) 
      ? favorites.filter(fid => fid !== id) 
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem(`elo_favs_${session.email}`, JSON.stringify(updated));
  };

  // Handle Mark as Completed
  const toggleCompleted = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = completedItems.includes(id)
      ? completedItems.filter(cid => cid !== id)
      : [...completedItems, id];
    setCompletedItems(updated);
    localStorage.setItem(`elo_progress_${session.email}`, JSON.stringify(updated));
  };

  // Save specific Insight note
  const handleSaveInsight = () => {
    if (!selectedItem) return;
    const updated = {
      ...userInsights,
      [selectedItem.id]: activeInsightText
    };
    setUserInsights(updated);
    localStorage.setItem(`elo_insights_${session.email}`, JSON.stringify(updated));
    alert('Reflexão de aprendizado arquivada com sucesso no seu baú pessoal.');
  };

  // Format second timings
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Audio Handlers
  const handleAudioPlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(e => {
          console.warn('Audio play blocked:', e);
          setIsPlaying(false);
        });
    }
  };

  const handleAudioScrub = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  // Video Handlers
  const handleVideoPlayPause = () => {
    if (!videoRef.current) return;
    if (videoIsPlaying) {
      videoRef.current.pause();
      setVideoIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => {
          setVideoIsPlaying(true);
        })
        .catch(e => {
          console.warn('Video play blocked:', e);
          setVideoIsPlaying(false);
        });
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setVideoProgress(pct || 0);
  };

  // Filter list by selected category, searchQuery, tab selection
  const filteredContents = LIBRARY_CONTENTS.filter(item => {
    const matchQuery = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;

    if (activeTab === 'favorites') {
      return favorites.includes(item.id) && matchQuery && matchCategory;
    }
    
    return matchQuery && matchCategory;
  });

  const handleOpenItem = (item: ContentItem) => {
    setSelectedItem(item);
    setActiveInsightText(userInsights[item.id] || '');
    // Reset players states
    setIsPlaying(false);
    setCurrentTime(0);
    setVideoIsPlaying(false);
    setVideoProgress(0);
  };

  const handleBackToLibrary = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setSelectedItem(null);
  };

  // Calculates completion of a specific track/pathway
  const getTrilhaProgress = (trilha: LearningTrilha) => {
    const matched = trilha.itemIds.filter(id => completedItems.includes(id));
    return Math.round((matched.length / trilha.itemIds.length) * 100);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto pb-24">
      
      {/* 1. CONTENT DETAIL SHEETS CONTAINER */}
      {selectedItem ? (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-6 animate-in fade-in duration-300">
          
          {/* Header Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToLibrary}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 px-3 py-2 rounded-2xl transition-all"
            >
              <ArrowLeft size={14} /> Voltar à Biblioteca
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => toggleFavorite(selectedItem.id, e)}
                className={`p-2.5 rounded-xl border transition-all ${
                  favorites.includes(selectedItem.id) 
                    ? 'bg-rose-50 border-rose-100 text-rose-500' 
                    : 'bg-white border-slate-100 text-slate-400 hover:text-rose-500'
                }`}
                title={favorites.includes(selectedItem.id) ? 'Remover dos favoritos' : 'Favoritar conteúdo'}
              >
                <Heart size={16} fill={favorites.includes(selectedItem.id) ? "currentColor" : "none"} />
              </button>

              <button
                onClick={(e) => toggleCompleted(selectedItem.id, e)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  completedItems.includes(selectedItem.id) 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                    : 'bg-white border-slate-100 text-slate-500 hover:text-emerald-600'
                }`}
              >
                {completedItems.includes(selectedItem.id) ? (
                  <>
                    <Check size={14} /> Concluída
                  </>
                ) : (
                  <>
                    <Circle size={14} /> Concluir
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cover & General Metadata */}
          <div className="space-y-3">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500 bg-rose-50 px-2.5 py-1 rounded-md inline-block">
              {selectedItem.category}
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 leading-tight">
              {selectedItem.title}
            </h2>
            <p className="text-xs text-slate-400">
              Conduzido por <strong>{selectedItem.author}</strong> • Formato: <span className="uppercase">{selectedItem.type === 'text' ? 'Artigo/Texto' : selectedItem.type}</span>
            </p>
          </div>

          {/* 1A. MEDIA PLAYER: AUDIO */}
          {selectedItem.type === 'audio' && (
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
              <audio
                ref={(el) => {
                  audioRef.current = el;
                }}
                src={selectedItem.mediaUrl}
                preload="metadata"
                onTimeUpdate={() => {
                  if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current) setDuration(audioRef.current.duration || 0);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  if (!completedItems.includes(selectedItem.id)) {
                    toggleCompleted(selectedItem.id);
                  }
                }}
              />

              {/* Music Player UI Layout */}
              <div className="flex items-center gap-4">
                <img 
                  src={selectedItem.coverImg} 
                  alt="Track Cover" 
                  className="w-14 h-14 rounded-2xl object-cover shadow-sm bg-slate-200 flex-shrink-0" 
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{selectedItem.title}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Sinfonia de Calma e Foco</p>
                </div>

                <button
                  onClick={handleAudioPlayPause}
                  className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
              </div>

              {/* Sound Scrubber Timeline */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => handleAudioScrub(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none transition-all"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Simulated Ambient Equalizer Lines */}
              <div className="flex items-center justify-center gap-1 py-1">
                {[...Array(24)].map((_, idx) => {
                  // Generates moving heights if playing
                  const animationStyle = isPlaying 
                    ? { animation: `barFluctuation 1s ease-in-out infinite alternate`, animationDelay: `${idx * 0.05}s` } 
                    : { height: '4px' };
                  return (
                    <span 
                      key={idx}
                      style={animationStyle}
                      className="w-1 bg-rose-400/80 rounded-full transition-all duration-300"
                    />
                  );
                })}
              </div>

              {/* Styles inject for the bar fluctuation animations */}
              <style>{`
                @keyframes barFluctuation {
                  0% { height: 4px; }
                  100% { height: 22px; }
                }
              `}</style>
            </div>
          )}

          {/* 1B. MEDIA PLAYER: HIGH-QUALITY CALMING VIDEO */}
          {selectedItem.type === 'video' && (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video shadow-md group">
                <video
                  ref={(el) => {
                    videoRef.current = el;
                  }}
                  src={selectedItem.mediaUrl}
                  loop
                  muted
                  playsInline
                  onTimeUpdate={handleVideoTimeUpdate}
                  className="w-full h-full object-cover"
                />

                {/* Subtitles Overlay Panel (Profound & calming bible-inspired guidance) */}
                {videoSubtitles && (
                  <div className="absolute inset-x-6 bottom-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10 animate-fade-in duration-300 pointer-events-none">
                    <p className="text-[11px] md:text-xs text-white/95 leading-normal italic select-none">
                      {videoProgress < 25 && '"Como as águas calmas refletem as estrelas, o espírito pacífico revela a sabedoria divina."'}
                      {(videoProgress >= 25 && videoProgress < 60) && '"A pressa cria castelos na areia, mas a paciência e a entrega amadurecem raízes profundas."'}
                      {(videoProgress >= 60 && videoProgress < 85) && '"Não se perturbe diante das tempestades de hoje; há um tempo para cada propósito sob o céu."'}
                      {videoProgress >= 85 && '"Descanse. Permita-se ser acolhido por um amor perfeito que desvia todas as inquietações."'}
                    </p>
                  </div>
                )}

                {/* Center Control Toggle Button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleVideoPlayPause}
                    className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 active:scale-95 transition-all flex items-center justify-center shadow-lg"
                  >
                    {videoIsPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                  </button>
                </div>
              </div>

              {/* Subtitle toggle helper */}
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Eye size={13} className="text-rose-500" />
                  Mantenha os olhos focados na quietude da paisagem.
                </span>

                <button
                  onClick={() => setVideoSubtitles(!videoSubtitles)}
                  className={`text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg border transition-colors ${
                    videoSubtitles 
                      ? 'bg-rose-50 border-rose-100 text-rose-600' 
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  {videoSubtitles ? 'Ocultar Reflexões' : 'Ver Reflexões'}
                </button>
              </div>
            </div>
          )}

          {/* 1C. MEDIA PLAYER: ARTICLE / TEXT COMPONENT */}
          <div className="space-y-4">
            
            {/* Font Magnifier Controls for elegant reading */}
            {selectedItem.type === 'text' && (
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <BookOpen size={13} className="text-rose-500" /> Leitura Atenta & Profunda
                </span>
                
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <span className="mr-1">Tamanho da Letra:</span>
                  <button 
                    onClick={() => setTextSize('sm')} 
                    className={`px-2 py-1 rounded ${textSize === 'sm' ? 'bg-white shadow text-slate-700 border border-slate-100' : 'hover:text-slate-600'}`}
                  >
                    A
                  </button>
                  <button 
                    onClick={() => setTextSize('md')} 
                    className={`px-2 py-1 rounded text-xs ${textSize === 'md' ? 'bg-white shadow text-slate-700 border border-slate-100' : 'hover:text-slate-600'}`}
                  >
                    A
                  </button>
                  <button 
                    onClick={() => setTextSize('lg')} 
                    className={`px-2 py-1 rounded text-sm ${textSize === 'lg' ? 'bg-white shadow text-slate-700 border border-slate-100' : 'hover:text-slate-600'}`}
                  >
                    A
                  </button>
                </div>
              </div>
            )}

            {/* Content Text Canvas */}
            <div className="bg-slate-50/30 p-4 rounded-3xl border border-slate-100/50">
              <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed italic mb-4">
                "{selectedItem.description}"
              </p>

              {selectedItem.bodyText ? (
                <div className={`text-slate-700 leading-relaxed space-y-4 whitespace-pre-line selection:bg-rose-100 ${
                  textSize === 'sm' ? 'text-xs' : textSize === 'lg' ? 'text-base md:text-lg' : 'text-sm md:text-base'
                }`}>
                  {selectedItem.bodyText}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  Acompanhe e absorva o áudio/vídeo completo para colher os pontos práticos desta lição.
                </p>
              )}
            </div>
          </div>

          {/* 1D. ESSENTIAL REFLEXION NOTEPAD: INSIGHT JOURNAL */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                <Edit3 size={15} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Seu Baú de Insights & Reflexões</h4>
                <p className="text-[10px] text-slate-400">Anote qual verdade tocou seu coração e como aplicá-la em sua rotina</p>
              </div>
            </div>

            <textarea
              rows={4}
              value={activeInsightText}
              onChange={(e) => setActiveInsightText(e.target.value)}
              placeholder="Ex: Hoje compreendi que preciso dar uma resposta mansa para as exigências domésticas no final do dia..."
              className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-400 placeholder:text-slate-400 transition-all font-sans"
            />

            <div className="flex justify-end p-0.5">
              <button
                onClick={handleSaveInsight}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Bookmark size={13} />
                Gravar no Histórico
              </button>
            </div>
          </div>

        </div>
      ) : (

        /* 2. THE MAIN LIBRARY DASHBOARD (OFFERING BOTH SMART RECOMMENDATIONS AND PATHWAYS) */
        <div className="space-y-6">
          
          {/* Dashboard Header Presentation */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-12 translate-y-8 opacity-5">
              <BookHeart size={180} />
            </div>
            
            <div className="relative space-y-4">
              <span className="bg-white/10 text-white/90 text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" /> Biblioteca de Transformação e Sabedoria
              </span>
              
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold tracking-tight">Caminhos de Sobriedade</h2>
                <p className="text-slate-300 text-xs leading-relaxed max-w-md">
                  Abasteça sua mente com áudios guiados, vídeos tranquilizantes e textos inspirados em verdades de força, amor e autodomínio.
                </p>
              </div>
            </div>
          </div>

          {/* 2A. USER-DIAGNOSTIC-SPECIFIC RECOMMENDATION CARD (INTEGRATED SMART SUGGESTION) */}
          {smartRecTheme && (
            <div className="bg-rose-50/50 p-5 rounded-3xl border border-rose-100/50 space-y-3.5 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-rose-100 rounded-lg text-rose-600 flex items-center justify-center">
                  <Compass size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-widest block">Recomendação Sistêmica</span>
                  <p className="text-xs font-bold text-slate-800">Direção prioritária: **{smartRecTheme.title}**</p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                {smartRecTheme.description}
              </p>

              <div className="pt-1 flex gap-2">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setActiveTab('trilhas');
                  }}
                  className="bg-white text-rose-600 border border-rose-100 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
                >
                  Ver Trilhas Mapeadas <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* 2B. SEARCH AND VIEW TAB CLASSIFICATION */}
          <div className="space-y-4">
            
            {/* Search Input Box */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar temas, áudios, vídeos..."
                className="w-full bg-white rounded-2xl border border-slate-200 py-3.5 pl-11 pr-5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-400 placeholder:text-slate-400 shadow-inner"
              />
              <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
              
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Segment Controls (Trilhas vs. Tudo vs. Favoritos) */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSelectedTrilha(null);
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                  activeTab === 'all' && !selectedTrilha 
                    ? 'bg-white text-rose-500 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Conteúdos
              </button>
              <button
                onClick={() => {
                  setActiveTab('trilhas');
                  setSelectedTrilha(null);
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                  activeTab === 'trilhas' 
                    ? 'bg-white text-rose-500 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Trilhas Práticas
              </button>
              <button
                onClick={() => {
                  setActiveTab('favorites');
                  setSelectedTrilha(null);
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                  activeTab === 'favorites' 
                    ? 'bg-white text-rose-500 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Salvos ({favorites.length})
              </button>
            </div>

            {/* Horizontal Category Pill List (Only visible if not viewing individual Trilha overview) */}
            {activeTab !== 'trilhas' && (
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {CATEGORIES_INFO.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                        isSelected 
                          ? 'border-rose-500 bg-rose-500 text-white shadow-sm scale-102' 
                          : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2C. SUB-VIEW: TRILHAS SELECTION */}
          {activeTab === 'trilhas' && (
            <div className="space-y-4">
              {selectedTrilha ? (
                /* Individual Learning Trilha Contents Steps */
                <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedTrilha(null)}
                      className="text-xs font-bold text-slate-500 hover:text-rose-500 bg-slate-50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      ← Voltar às Trilhas
                    </button>
                    
                    {/* Completion Meter bubble */}
                    <div className="bg-rose-50 text-rose-600 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      Progresso: {getTrilhaProgress(selectedTrilha)}%
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{selectedTrilha.icon}</span>
                      <h3 className="text-lg font-extrabold text-slate-800">{selectedTrilha.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {selectedTrilha.description}
                    </p>
                  </div>

                  {/* List of lesson items within the trilha */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Passos da sua Jornada</p>
                    
                    {selectedTrilha.itemIds.map((itemId, index) => {
                      const item = LIBRARY_CONTENTS.find(li => li.id === itemId);
                      if (!item) return null;
                      
                      const isItemCompleted = completedItems.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenItem(item)}
                          className="group bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 cursor-pointer transition-all hover:translate-x-1"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-4 block text-center">
                              {index + 1}
                            </span>

                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-rose-500 flex-shrink-0">
                              {item.type === 'audio' && <Volume2 size={16} />}
                              {item.type === 'video' && <Video size={16} />}
                              {item.type === 'text' && <BookOpen size={16} />}
                            </div>

                            <div>
                              <p className="text-xs font-bold text-slate-700 group-hover:text-rose-500 transition-colors">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[280px]">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                              {item.duration}
                            </span>
                            
                            {isItemCompleted ? (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            ) : (
                              <ChevronRight size={14} className="text-slate-300" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* List of all learning pathways available */
                <div className="grid gap-4">
                  {LEARNING_TRILHAS.map((trilha) => {
                    const completionPct = getTrilhaProgress(trilha);
                    return (
                      <div
                        key={trilha.id}
                        onClick={() => setSelectedTrilha(trilha)}
                        className="bg-white p-5 rounded-3xl border border-slate-100 space-y-4 hover:border-rose-200 cursor-pointer shadow-sm transition-all group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl">
                              {trilha.icon}
                            </div>
                            
                            <div>
                              <h3 className="font-bold text-slate-800 text-sm group-hover:text-rose-500 transition-all leading-snug">
                                {trilha.title}
                              </h3>
                              <p className="text-[11px] text-slate-400 uppercase tracking-widest">{trilha.itemIds.length} aulas • Categoria: {trilha.category}</p>
                            </div>
                          </div>

                          <ChevronRight size={18} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
                        </div>

                        <p className="text-xs text-slate-500 leading-normal">
                          {trilha.description}
                        </p>

                        {/* Pathway Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>Status da Trilha</span>
                            <span className="text-rose-500">{completionPct}% Concluída</span>
                          </div>
                          
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 rounded-full transition-all duration-500"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2D. SUB-VIEW: LIST GENERAL CONTENTS */}
          {activeTab !== 'trilhas' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {activeTab === 'favorites' ? 'Seus Materiais Favoritos' : 'Reflexões e Aulas Disponíveis'} ({filteredContents.length})
                </p>
                
                {selectedCategory !== 'all' && (
                  <button 
                    onClick={() => setSelectedCategory('all')}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Ver Tudo
                  </button>
                )}
              </div>

              {filteredContents.length > 0 ? (
                <div className="grid gap-3.5">
                  {filteredContents.map((item) => {
                    const isItemFav = favorites.includes(item.id);
                    const isItemCompleted = completedItems.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleOpenItem(item)}
                        className="group bg-white p-4 rounded-3xl border border-slate-100 flex gap-4 hover:border-rose-200 cursor-pointer shadow-sm transition-all hover:translate-y-[-1px]"
                      >
                        {/* Material thumbnail cover */}
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 relative flex-shrink-0">
                          <img 
                            src={item.coverImg} 
                            alt={item.title} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/10" />
                          
                          {/* Floating Type Icon */}
                          <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm shadow p-1 rounded-lg text-rose-500">
                            {item.type === 'audio' && <Volume2 size={11} />}
                            {item.type === 'video' && <Video size={11} />}
                            {item.type === 'text' && <BookOpen size={11} />}
                          </div>
                        </div>

                        {/* Material Description Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {item.category}
                              </span>
                              
                              <span className="text-[9px] text-slate-400 font-mono">
                                Dur.: {item.duration}
                              </span>
                            </div>

                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-rose-500 transition-colors truncate">
                              {item.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-slate-50">
                            <span className="text-slate-400 font-medium">Por: {item.author}</span>
                            
                            <div className="flex items-center gap-2">
                              {/* Favorite star */}
                              <button
                                type="button"
                                onClick={(e) => toggleFavorite(item.id, e)}
                                className={`p-1 rounded-md transition-all ${isItemFav ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'}`}
                              >
                                <Heart size={12} fill={isItemFav ? 'currentColor' : 'none'} />
                              </button>
                              
                              {/* Completion dot */}
                              {isItemCompleted ? (
                                <CheckCircle2 size={13} className="text-emerald-500" />
                              ) : (
                                <Circle size={13} className="text-slate-300" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* No contents matching filters query state */
                <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3">
                  <div className="text-3xl text-slate-300">🍃</div>
                  <h4 className="font-bold text-slate-700 text-sm">Nenhum conteúdo localizado</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Não encontramos materiais para os filtros aplicados. Tente reduzir as palavras de busca ou selecione outra categoria de sabedoria.
                  </p>
                  <button 
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className="bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    Redefinir Filtros
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};
