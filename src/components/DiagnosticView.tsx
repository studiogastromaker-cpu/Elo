import React, { useState, useEffect } from 'react';
import { UserSession, DiagnosticArea, DiagnosticResult, DiagnosticQuestion } from '../types';
import { Compass, Sparkles, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Award, HelpCircle, Activity, Undo2, Calendar, Trash2, ArrowUpRight } from 'lucide-react';

interface DiagnosticViewProps {
  session: UserSession;
}

const AREAS: { id: DiagnosticArea; label: string; icon: string }[] = [
  { id: 'emocional', label: 'Emocional', icon: '🧠' },
  { id: 'espiritual', label: 'Espiritual', icon: '🕊️' },
  { id: 'relacionamentos', label: 'Relacionamento', icon: '🤝' },
  { id: 'saude', label: 'Saúde', icon: '🍎' },
  { id: 'financeiro', label: 'Financeiro', icon: '💰' },
  { id: 'proposito', label: 'Propósito', icon: '🎯' },
  { id: 'produtividade', label: 'Foco e Gestão', icon: '⚡' },
  { id: 'habitos', label: 'Hábitos', icon: '🌱' },
  { id: 'mentalidade', label: 'Mentalidade', icon: '💡' },
  { id: 'equilibrio', label: 'Equilíbrio', icon: '⚓' },
  { id: 'familia', label: 'Família', icon: '🏡' },
];

const QUESTIONS: DiagnosticQuestion[] = [
  {
    area: 'emocional',
    title: 'Autogestão Emocional',
    question: 'Como você avalia sua capacidade de lidar de forma equilibrada com sentimentos desafiadores como impaciência, raiva ou ansiedade no seu cotidiano?',
    lowLabel: 'Fico facilmente abalado e reajo por impulso',
    highLabel: 'Consigo manter a serenidade e respirar antes de agir'
  },
  {
    area: 'espiritual',
    title: 'Conexão Espiritual & Paz Interior',
    question: 'Quão frequente é a presença de sentimentos de comunhão com o invisível, oração, interiorização silenciosa e uma paz profunda que excede o entendimento?',
    lowLabel: 'Sinto um vazio interior ou distância constantes',
    highLabel: 'Sinto uma fé profunda e um abrigo seguro em Deus'
  },
  {
    area: 'relacionamentos',
    title: 'Relacionamentos Saudáveis',
    question: 'Como você avalia o nível de diálogo, compreensão mútua, generosidade e ausência de julgamento nas suas amizades e interações sociais?',
    lowLabel: 'Sinto-me incompreendido ou em constantes conflitos',
    highLabel: 'Cercado de amigos verdadeiros com conexões leais'
  },
  {
    area: 'saude',
    title: 'Cuidado com a Saúde & Corpo',
    question: 'Como está o seu autocuidado com o corpo físico (qualidade de sono, alimentação nutritiva, hidratação e disposição física)?',
    lowLabel: 'Negligenciado, sinto exaustão física constante',
    highLabel: 'Vigoroso, valorizo meu corpo como um templo precioso'
  },
  {
    area: 'financeiro',
    title: 'Sabedoria Financeira',
    question: 'Quão equilibrada está a sua organização com o dinheiro, capacidade de poupar e sabedoria de consumir sem pressa ou impulsividade?',
    lowLabel: 'Preocupado, sinto instabilidade ou consumo por impulso',
    highLabel: 'Tranquilo, administro meus recursos com prudência'
  },
  {
    area: 'proposito',
    title: 'Propósito & Rumo',
    question: 'Quão clara é para você a direção do seu caminho, sabendo para onde está indo e compreendendo o valor singular da sua existência?',
    lowLabel: 'Sinto-me sem rumo, perdido ou sem sentido',
    highLabel: 'Tenho clareza de convicção e rumo definidos'
  },
  {
    area: 'produtividade',
    title: 'Foco & Gestão de Tempo',
    question: 'Como percebe sua habilidade em priorizar o que é realmente importante, evitando distrações constantes ou a perigosa procrastinação?',
    lowLabel: 'Sempre sobrecarregado de urgências sem progredir',
    highLabel: 'Consigo focar no que é vital com leveza e excelência'
  },
  {
    area: 'habitos',
    title: 'Hábitos Espontâneos',
    question: 'Com que constância você consegue sustentar rotinas saudáveis e positivas, perseverando mesmo nos dias de menor motivação?',
    lowLabel: 'Sou muito inconstante, desisto facilmente',
    highLabel: 'Sólida constância, sigo em frente passo a passo'
  },
  {
    area: 'mentalidade',
    title: 'Mentalidade de Maturidade & Crescimento',
    question: 'Como você reage perante erros, fracassos ou críticas? Há resiliência para entender que todos os desafios cooperam para o seu amadurecimento?',
    lowLabel: 'Culpo-me intensamente ou fico preso ao passado',
    highLabel: 'Vejo aprendizado em tudo, perdoo e sigo em frente'
  },
  {
    area: 'equilibrio',
    title: 'Equilíbrio Pessoal & Lazer',
    question: 'Quão bem você divide seu tempo para desacelerar, contemplar a sabedoria da natureza, sorrir e desfrutar do descanso sem culpar-se?',
    lowLabel: 'Vivendo com pressa ininterrupta ou estresse agudo',
    highLabel: 'Desfruto de pausas restauradoras e paz mental'
  },
  {
    area: 'familia',
    title: 'Harmonia Familiar',
    question: 'Como você avalia a saúde da convivência, paciência para escutar, prática constante do perdão mútuo e carinho no ambiente familiar?',
    lowLabel: 'Muitos atritos frequentes ou frieza comunicativa',
    highLabel: 'Laços de afeto constantes e diálogo respeitoso'
  }
];

export const DiagnosticView: React.FC<DiagnosticViewProps> = ({ session }) => {
  const [history, setHistory] = useState<DiagnosticResult[]>([]);
  const [currentResult, setCurrentResult] = useState<DiagnosticResult | null>(null);
  
  // Quiz Flow
  const [isQuizzing, setIsQuizzing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key in DiagnosticArea]?: number }>({});
  
  // Load diagnostic history on mount
  useEffect(() => {
    const key = `elo_diagnostics_${session.email}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed: DiagnosticResult[] = JSON.parse(raw);
        setHistory(parsed);
        if (parsed.length > 0) {
          setCurrentResult(parsed[0]); // show most recent by default
        }
      } catch (e) {
        console.error('Erro ao ler diagnósticos:', e);
      }
    }
  }, [session]);

  const saveResultToLocalStorage = (result: DiagnosticResult) => {
    const updatedHistory = [result, ...history];
    setHistory(updatedHistory);
    setCurrentResult(result);
    localStorage.setItem(`elo_diagnostics_${session.email}`, JSON.stringify(updatedHistory));
  };

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja apagar este diagnóstico do seu histórico? Isso é permanente.')) {
      const updated = history.filter(h => h.id !== id);
      setHistory(updated);
      localStorage.setItem(`elo_diagnostics_${session.email}`, JSON.stringify(updated));
      
      if (currentResult?.id === id) {
        setCurrentResult(updated.length > 0 ? updated[0] : null);
      }
    }
  };

  const handleStartQuiz = () => {
    setAnswers({});
    setCurrentIdx(0);
    setIsQuizzing(true);
  };

  const handleSelectScore = (score: number) => {
    const area = QUESTIONS[currentIdx].area;
    setAnswers(prev => ({ ...prev, [area]: score }));
  };

  const handleNext = () => {
    const area = QUESTIONS[currentIdx].area;
    if (answers[area] === undefined) {
      alert('Por favor, selecione uma nota de 1 a 10 para continuar.');
      return;
    }
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      finishQuiz();
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const generateGuidanceText = (
    strengths: DiagnosticArea[],
    weaknesses: DiagnosticArea[],
    scores: { [key in DiagnosticArea]: number }
  ): string => {
    // Elegant, highly customized guidance inspired by wisdom and gentle biblical principles.
    let text = "Com base nas suas respostas de hoje, percebe-se um momento de reflexão profunda. ";
    
    // Strengths
    if (strengths.length > 0) {
      const areaName1 = AREAS.find(a => a.id === strengths[0])?.label || '';
      const areaName2 = strengths[1] ? AREAS.find(a => a.id === strengths[1])?.label : '';
      
      text += `Você demonstra excelente equilíbrio e força em sua área **${areaName1}**${areaName2 ? ` e na área **${areaName2}**` : ''}. `;
      text += `Como ensina a antiga sabedoria, caminhar com retidão e sabedoria nestas áreas consolida bases firmes, como uma casa fundada sobre a rocha estável. Use essa clareza mental para servir de âncora a outros aspectos de sua rotina diária. `;
    }

    // Weaknesses
    if (weaknesses.length > 0) {
      const wArea = weaknesses[0];
      const areaName = AREAS.find(a => a.id === wArea)?.label || '';
      
      text += `\n\nNeste momento, a área **${areaName}** (nota ${scores[wArea]}/10) sinaliza um convite amigável à pausa e ao autocuidado guiado por mansidão. `;
      
      switch (wArea) {
        case 'emocional':
          text += "Lembre-se de que reações calmas neutralizam impulsos de irritação. Como em Provérbios, 'a resposta sincera e mansa desvia o furor'. Nutra a paz mental dando um passo atrás antes de responder com pressa.";
          break;
        case 'espiritual':
          text += "Quando tudo parecer acelerado lá fora, busque o recolhimento pacífico. Silenciar o coração permite encontrar abrigo e força renovada, fortalecendo a esperança essencial para dias melhores.";
          break;
        case 'relacionamentos':
          text += "Nos relacionamentos, exercite a generosidade de escutar sem intenção imediata de julgar. O amor acolhedor e a paciência desarmam discussões vazias e tecem redes de apoio insubstituíveis.";
          break;
        case 'familia':
          text += "Laços familiares demandam cultivar paciência diária e praticar o perdão como um ato de liberdade. Reconciliar atritos com palavras gentis atua como bálsamo suavizador.";
          break;
        case 'saude':
          text += "O corpo é o instrumento precioso através do qual você vive e expressa seu propósito. Respeitar limites, dormir em paz e nutrir-se com equilíbrio são deveres fundamentais de autocompaixão.";
          break;
        case 'financeiro':
          text += "A estabilidade provém da moderação e do respeito ao tempo correto de colher. Praticar a prudência financeira de conter impulsos gera tranquilidade constante e protege contra tempestades imprevistas.";
          break;
        case 'proposito':
          text += "Em tempos de dispersão, lembre-se de que há um tempo para cada propósito sob o céu. Seu valor não é medido por desempenho acelerado, mas pelo significado genuíno impresso em pequenos atos de entrega.";
          break;
        case 'mentalidade':
          text += "O erro não define quem você é, mas atua como guia de aprimoramento. Cultive uma atitude generosa consigo mesmo. A maturidade se estabelece ao deixarmos ir o peso de culpas antigas.";
          break;
        case 'equilibrio':
          text += "A pressa crônica desgasta a beleza da jornada. Há sabedoria em desacelerar os pensamentos, contemplar a natureza e repousar com a certeza de que o amanhã trará suas próprias providências.";
          break;
        case 'produtividade':
        case 'habitos':
          text += "O progresso sincero provém de pequenas sementes cultivadas todos os dias com carinho, não de esforços esgotantes. Priorize o essencial e abrace a simplicidade de fazer uma coisa por vez.";
          break;
        default:
          text += "Pequenos hábitos cultivados com paciência e autodomínio diários desabrocham em transformações magníficas e duradouras.";
          break;
      }
    }

    text += "\n\nContinue sua jornada com fé e esperança realista. Cada amanhecer oferece uma nova oportunidade de realinhamento interior e cura.";
    return text;
  };

  const finishQuiz = () => {
    const scores: { [key in DiagnosticArea]: number } = {} as any;
    
    AREAS.forEach(area => {
      scores[area.id] = answers[area.id] || 5;
    });

    // Determine strengths & weaknesses
    const sortedAreas = [...AREAS].sort((a, b) => (scores[b.id] - scores[a.id]));
    const strengths = sortedAreas.slice(0, 2).map(a => a.id);
    const weaknesses = sortedAreas.slice(-2).reverse().map(a => a.id);

    const guidance = generateGuidanceText(strengths, weaknesses, scores);

    const newResult: DiagnosticResult = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      scores,
      strengths,
      weaknesses,
      guidance
    };

    saveResultToLocalStorage(newResult);
    setIsQuizzing(false);
  };

  // Radar SVG Mathematics
  const radius = 95;
  const center = 150;
  const svgSize = 300;
  const N = AREAS.length;

  const getCoordinates = (index: number, score: number) => {
    // angle calculations. Adjust offset to align perfectly
    const angle = (index * 2 * Math.PI) / N - Math.PI / 2;
    const valueFactor = score / 10;
    const x = center + radius * valueFactor * Math.cos(angle);
    const y = center + radius * valueFactor * Math.sin(angle);
    return { x, y };
  };

  const getLabelCoordinates = (index: number) => {
    const angle = (index * 2 * Math.PI) / N - Math.PI / 2;
    // Labels outer offset
    const x = center + (radius + 20) * Math.cos(angle);
    const y = center + (radius + 15) * Math.sin(angle);
    return { x, y };
  };

  // Background Concentric Rings (levels 2, 4, 6, 8, 10)
  const rings = [2, 4, 6, 8, 10];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto pb-24">
      
      {/* Quiz Progress Screen */}
      {isQuizzing ? (
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{AREAS[currentIdx].icon}</span>
              <div>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Área {currentIdx + 1} de {QUESTIONS.length}</span>
                <h3 className="font-bold text-slate-800 text-sm leading-tight">{QUESTIONS[currentIdx].title}</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
              {Math.round(((currentIdx + 1) / QUESTIONS.length) * 100)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>

          {/* Question Text */}
          <div className="space-y-3 py-2">
            <p className="text-slate-700 text-base md:text-lg font-medium leading-relaxed">
              "{QUESTIONS[currentIdx].question}"
            </p>
          </div>

          {/* Answer Area 1-10 Slider */}
          <div className="space-y-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
            <div className="text-center">
              <span className="text-4xl font-extrabold text-rose-500 font-accent">
                {answers[QUESTIONS[currentIdx].area] || '—'}
              </span>
              <span className="text-slate-400 text-xs font-bold font-accent">/10</span>
              
              <p className="text-xs text-slate-500 mt-2 italic">
                {(answers[QUESTIONS[currentIdx].area] || 0) <= 2 && 'Exige atenção extrema e cuidado gentil'}
                {((answers[QUESTIONS[currentIdx].area] || 0) > 2 && (answers[QUESTIONS[currentIdx].area] || 0) <= 5) && 'Necessita de reflexão e pequenos ajustes'}
                {((answers[QUESTIONS[currentIdx].area] || 0) > 5 && (answers[QUESTIONS[currentIdx].area] || 0) <= 8) && 'Bom equilíbrio, rumo à consolidação'}
                {((answers[QUESTIONS[currentIdx].area] || 0) > 8) && 'Excelente fluidez, estabilidade firme'}
              </p>
            </div>

            {/* Score Grid Buttons */}
            <div className="grid grid-cols-5 gap-2 md:gap-3 max-w-md mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isSelected = answers[QUESTIONS[currentIdx].area] === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectScore(num)}
                    className={`h-11 rounded-xl font-bold transition-all flex items-center justify-center border-2 ${
                      isSelected 
                        ? 'bg-rose-500 border-rose-500 text-white shadow-md scale-105' 
                        : 'bg-white border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 font-bold px-2">
              <span className="max-w-[150px]">{QUESTIONS[currentIdx].lowLabel}</span>
              <span className="text-right max-w-[150px]">{QUESTIONS[currentIdx].highLabel}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBack}
              disabled={currentIdx === 0}
              className="flex-1 py-3.5 bg-slate-50 border border-slate-100 font-bold text-slate-500 hover:bg-slate-100 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3.5 bg-rose-500 text-white hover:bg-rose-600 font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-colors"
            >
              {currentIdx === QUESTIONS.length - 1 ? 'Concluir' : 'Próxima'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Default / Dashboard Screen */
        <div className="space-y-6">

          {/* Profile header */}
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
              <Compass size={200} />
            </div>
            <div className="relative space-y-4">
              <span className="bg-white/25 text-white/95 text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1">
                <Compass size={11} /> Diagnóstico Sistêmico Integrado
              </span>
              <div className="space-y-1">
                <h2 className="text-2xl font-extrabold tracking-tight">Avalie sua Roda da Vida</h2>
                <p className="text-rose-100 text-xs leading-relaxed max-w-md">
                  Uma ferramenta de autoconhecimento profundo inspirada na sabedoria integral, projetada para identificar pontos de harmonia e convites à superação.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStartQuiz}
                  className="bg-white text-rose-600 hover:bg-rose-50 font-bold text-xs py-3.5 px-6 rounded-xl uppercase tracking-wider shadow-sm transition-all inline-flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <Activity size={15} /> 
                  {history.length > 0 ? 'Fazer Nova Avaliação' : 'Iniciar Diagnóstico'}
                </button>
              </div>
            </div>
          </div>

          {/* Current Evaluation Details */}
          {currentResult ? (
            <div className="space-y-6">
              
              {/* Radar Graphic Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
                <div className="flex flex-col md:flex-row items-center md:justify-between gap-4 pb-4 border-b border-indigo-50/50">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                      <Activity size={18} className="text-rose-500" />
                      Gráfico de Equilíbrio Integral
                    </h3>
                    <p className="text-xs text-slate-400">
                      Avaliação realizada em {new Date(currentResult.timestamp).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {/* Select other record */}
                  {history.length > 1 && (
                    <div className="flex items-center gap-1.5 w-full md:w-auto">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Ver:</span>
                      <select
                        value={currentResult.id}
                        onChange={(e) => {
                          const found = history.find(h => h.id === e.target.value);
                          if (found) setCurrentResult(found);
                        }}
                        className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-rose-300 cursor-pointer w-full md:w-auto"
                      >
                        {history.map(item => (
                          <option key={item.id} value={item.id}>
                            {new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ({(Object.values(item.scores) as number[]).reduce((a, b) => a + b, 0)} pts)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* SVG Radar Visualization */}
                <div className="flex flex-col items-center justify-center py-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                  <svg 
                    viewBox={`0 0 ${svgSize} ${svgSize}`} 
                    className="w-full max-w-[320px] h-auto drop-shadow-sm transition-all"
                  >
                    {/* Level Rings labels 20, 40, 60, 80, 100 */}
                    {rings.map((ringVal) => (
                      <text
                        key={`ring-text-${ringVal}`}
                        x={center}
                        y={center - (radius * ringVal / 10) + 3}
                        className="text-[8px] font-bold fill-slate-300 text-center"
                        textAnchor="middle"
                      >
                        {ringVal}
                      </text>
                    ))}

                    {/* Concentric rings polygons */}
                    {rings.map((ringVal) => {
                      const points = AREAS.map((_, i) => {
                        const { x, y } = getCoordinates(i, ringVal);
                        return `${x},${y}`;
                      }).join(' ');
                      return (
                        <polygon
                          key={`ring-${ringVal}`}
                          points={points}
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray={ringVal === 10 ? "none" : "2,2"}
                        />
                      );
                    })}

                    {/* Radial lines from center to outer ring vertex */}
                    {AREAS.map((_, i) => {
                      const outerCoord = getCoordinates(i, 10);
                      return (
                        <line
                          key={`axis-${i}`}
                          x1={center}
                          y1={center}
                          x2={outerCoord.x}
                          y2={outerCoord.y}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* The User Polygons Score Visualization! */}
                    {(() => {
                      const userPoints = AREAS.map((area, i) => {
                        const score = currentResult.scores[area.id] || 5;
                        const { x, y } = getCoordinates(i, score);
                        return `${x},${y}`;
                      }).join(' ');

                      return (
                        <>
                          {/* Inner fill area with opacity */}
                          <polygon
                            points={userPoints}
                            fill="url(#rose-gradient)"
                            fillOpacity="0.4"
                            stroke="#f43f5e"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            className="animate-in fade-in duration-700"
                          />
                          {/* Circle dot markers at vertices for neat look */}
                          {AREAS.map((area, i) => {
                            const score = currentResult.scores[area.id] || 5;
                            const { x, y } = getCoordinates(i, score);
                            return (
                              <circle
                                key={`v-${i}`}
                                cx={x}
                                cy={y}
                                r="4"
                                className="fill-white stroke-rose-500 stroke-2 cursor-pointer hover:r-5 transition-all"
                                title={`${area.label}: ${score}/10`}
                              />
                            );
                          })}
                        </>
                      );
                    })()}

                    {/* Outer label texts for each Area */}
                    {AREAS.map((area, i) => {
                      const { x, y } = getLabelCoordinates(i);
                      const score = currentResult.scores[area.id] || 5;
                      const textAnchor = x > center ? 'start' : x < center ? 'end' : 'middle';
                      return (
                        <g key={`g-label-${i}`}>
                          <text
                            x={x}
                            y={y - 2}
                            textAnchor={textAnchor}
                            className="text-[9px] font-bold fill-slate-700 font-sans"
                          >
                            {area.icon} {area.label}
                          </text>
                          <text
                            x={x}
                            y={y + 7}
                            textAnchor={textAnchor}
                            className={`text-[8px] font-extrabold ${score <= 4 ? 'fill-rose-500' : score >= 8 ? 'fill-emerald-600' : 'fill-slate-400'}`}
                          >
                            {score}/10
                          </text>
                        </g>
                      );
                    })}

                    {/* Gradient Definitions */}
                    <defs>
                      <radialGradient id="rose-gradient" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Strengths & Weaknesses Panel */}
              <div className="grid md:grid-cols-2 gap-4">
                
                {/* Highlights */}
                <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100/50 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Award size={14} className="text-emerald-500" />
                    Pontos de Harmonia (Luz)
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Áreas que sustentam seu momento atual com vitalidade e resiliência:
                  </p>
                  <div className="space-y-2">
                    {currentResult.strengths.map((st) => {
                      const areaItem = AREAS.find(a => a.id === st);
                      return (
                        <div key={st} className="bg-white px-3.5 py-2.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{areaItem?.icon}</span>
                            <span>{areaItem?.label}</span>
                          </span>
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                            {currentResult.scores[st]}/10
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* For improvement */}
                <div className="bg-amber-50/40 p-5 rounded-3xl border border-amber-100/50 space-y-3">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Compass size={14} className="text-amber-500" />
                    Convites à Superação (Atenção)
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Focos de cansaço ou dispersão que pedem paciência e ajustes atenciosos:
                  </p>
                  <div className="space-y-2">
                    {currentResult.weaknesses.map((wk) => {
                      const areaItem = AREAS.find(a => a.id === wk);
                      return (
                        <div key={wk} className="bg-white px-3.5 py-2.5 rounded-xl border border-amber-100 flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <span className="text-base">{areaItem?.icon}</span>
                            <span>{areaItem?.label}</span>
                          </span>
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                            {currentResult.scores[wk]}/10
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bible inspired wise guidance panel */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">Direcionamento e Sabedoria da Jornada</h4>
                    <p className="text-[10px] text-slate-400">Diretrizes calmas e sábias personalizadas no seu momento</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed space-y-3 whitespace-pre-line px-1">
                  {currentResult.guidance}
                </div>
              </div>

              {/* Evaluation History List */}
              {history.length > 1 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Seu Histórico de Alinhamentos</h4>
                  <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto pr-1">
                    {history.map((record) => {
                      const totalPoints = (Object.values(record.scores) as number[]).reduce((a, b) => a + b, 0);
                      const average = (totalPoints / AREAS.length).toFixed(1);
                      return (
                        <div 
                          key={record.id}
                          onClick={() => setCurrentResult(record)}
                          className={`py-3 flex items-center justify-between text-xs cursor-pointer group hover:bg-slate-50/50 px-2.5 rounded-xl transition-all ${
                            currentResult.id === record.id ? 'bg-slate-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="font-bold text-slate-700">
                              {new Date(record.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                              {record.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-slate-500">
                              Média Geral: <strong className="text-rose-500">{average}</strong>
                            </span>
                            
                            <button
                              onClick={(e) => handleDeleteRecord(record.id, e)}
                              className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition-colors"
                              title="Deletar este registro"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Intro / Call to Action if no evaluations at all */
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center space-y-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <Compass size={32} />
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-xl font-bold text-slate-800">Seu primeiro alinhamento</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Bem-vindo ao diagnóstico sistêmico do Elo. Convidamos você a avaliar de forma sincera, em 11 áreas vitais, como está caminhando a sua vida.
                </p>
              </div>

              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/30 text-left max-w-md mx-auto space-y-2.5 text-xs text-slate-600">
                <p className="font-bold text-rose-800 text-center uppercase tracking-wider text-[10px]">O que você obterá:</p>
                <div className="flex items-start gap-2">
                  <span>🕊️</span>
                  <span><strong>Visualização em teia (Radar):</strong> Entenda visualmente quais pilares estão fortes e quais pedem acolhimento.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>📖</span>
                  <span><strong>Direcionamento Sábio:</strong> Reflexões calmas baseadas em ensinamentos clássicos de sabedoria secular e bíblica estruturada.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>📈</span>
                  <span><strong>Linha de Evolução:</strong> Salve quanto desejar para acompanhar a mudança e o amadurecimento dos seus hábitos ao longo das semanas.</span>
                </div>
              </div>

              <button
                onClick={handleStartQuiz}
                className="py-3.5 px-8 bg-rose-500 text-white hover:bg-rose-600 font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all w-full max-w-xs"
              >
                Iniciar Agora
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
