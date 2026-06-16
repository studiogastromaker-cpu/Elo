import React, { useState, useEffect } from 'react';
import { UserSession } from '../types';
import { 
  CheckSquare, Square, Plus, Trash2, Calendar, Bell, Sparkles, TrendingUp, 
  Activity, Award, AlertCircle, ThumbsUp, Clock, ChevronRight, CheckCircle2, 
  BookOpen, Heart, ArrowRight, RefreshCw, BarChart2
} from 'lucide-react';

interface RoutineViewProps {
  session: UserSession;
}

interface PersonalHabit {
  id: string;
  title: string;
  purpose: string;
  category: string;
  preferredTime: 'manha' | 'tarde' | 'noite' | 'dia';
  streak: number;
  history: { [dateKey: string]: boolean };
}

interface RoutineTask {
  id: string;
  title: string;
  purpose: string;
  priority: 'alta' | 'media' | 'baixa';
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, etc.
  completed: boolean;
  category: string;
}

interface HealthyReminder {
  id: string;
  time: string;
  title: string;
  message: string;
  category: string;
  enabled: boolean;
}

const DEFAULT_HABITS: PersonalHabit[] = [
  {
    id: 'h-01',
    title: 'Respiração de 3 Minutos',
    purpose: 'Ancorar o espírito no presente e dissipar a agitação mental',
    category: 'ansiedade',
    preferredTime: 'manha',
    streak: 3,
    history: {}
  },
  {
    id: 'h-02',
    title: 'Registro de 3 Gratidões',
    purpose: 'Educar o olhar para reconhecer a providência e o belo',
    category: 'autoestima',
    preferredTime: 'noite',
    streak: 4,
    history: {}
  },
  {
    id: 'h-03',
    title: 'Corte de Ruídos Digitais',
    purpose: 'Fazer um jejum de telas por 1 hora para recobrar foco mansa',
    category: 'clareza mental',
    preferredTime: 'tarde',
    streak: 2,
    history: {}
  },
  {
    id: 'h-04',
    title: 'Leitura Reflexiva Curta',
    purpose: 'Inundar a mente com ensinamentos de sabedoria e paz',
    category: 'paz',
    preferredTime: 'dia',
    streak: 5,
    history: {}
  }
];

const DEFAULT_TASKS: RoutineTask[] = [
  {
    id: 't-01',
    title: 'Fazer o Alinhamento Diário',
    purpose: 'Avaliar sentimentos e restabelecer o prumo interior',
    priority: 'alta',
    dayOfWeek: new Date().getDay(),
    completed: true,
    category: 'paz'
  },
  {
    id: 't-02',
    title: 'Enviar mensagem sincera de gratidão',
    purpose: 'Reatar laços simples e cultivar comunhão',
    priority: 'media',
    dayOfWeek: new Date().getDay(),
    completed: false,
    category: 'relacionamentos'
  },
  {
    id: 't-03',
    title: 'Organizar espelho de trabalho',
    purpose: 'Limpar excessos materiais para liberar clareza criativa',
    priority: 'baixa',
    dayOfWeek: new Date().getDay(),
    completed: false,
    category: 'disciplina'
  }
];

const DEFAULT_REMINDERS: HealthyReminder[] = [
  {
    id: 'r-01',
    time: '08:00',
    title: 'Despertar de Esperança',
    message: '"Não andeis ansiosos. Comece o dia bebendo água devagar e respirando fundo."',
    category: 'paz',
    enabled: true
  },
  {
    id: 'r-02',
    time: '14:30',
    title: 'Pausa para Auto-reparo',
    message: '"Pare por 2 minutos. Sinta os ombros caírem e relaxe a mandíbula."',
    category: 'ansiedade',
    enabled: true
  },
  {
    id: 'r-03',
    time: '21:30',
    title: 'Arrumação da Noite',
    message: '"Entregue as pressões do dia. O que coube a você foi feito; descanse na graça."',
    category: 'cura emocional',
    enabled: false
  }
];

const CATEGORIES = [
  { id: 'all', label: 'Todos os Temas', icon: '✨' },
  { id: 'ansiedade', label: 'Ansiedade / Paz', icon: '🍃' },
  { id: 'autoestima', label: 'Autoestima / Valor', icon: '🌸' },
  { id: 'disciplina', label: 'Foco / Disciplina', icon: '⏳' },
  { id: 'relacionamentos', label: 'Apoio / Relacionamentos', icon: '🫂' }
];

const DAYS_OF_WEEK_LABELS = [
  { num: 0, label: 'Dom', short: 'D' },
  { num: 1, label: 'Seg', short: 'S' },
  { num: 2, label: 'Ter', short: 'T' },
  { num: 3, label: 'Qua', short: 'Q' },
  { num: 4, label: 'Qui', short: 'Q' },
  { num: 5, label: 'Sex', short: 'S' },
  { num: 6, label: 'Sáb', short: 'S' }
];

export const RoutineView: React.FC<RoutineViewProps> = ({ session }) => {
  const email = session.email;
  const todayKey = new Date().toISOString().split('T')[0];
  const currentDayOfWeekNum = new Date().getDay();

  // Selected sub-tab under Routine View
  const [innerTab, setInnerTab] = useState<'dailies' | 'habits' | 'reminders'>('dailies');
  
  // Data States
  const [habits, setHabits] = useState<PersonalHabit[]>([]);
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [reminders, setReminders] = useState<HealthyReminder[]>([]);
  
  // Filtering & Add form states
  const [themeFilter, setThemeFilter] = useState('all');
  const [activeDaySelector, setActiveDaySelector] = useState<number>(currentDayOfWeekNum);

  // New Habit creation Form State
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitPurpose, setNewHabitPurpose] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('ansiedade');
  const [newHabitTime, setNewHabitTime] = useState<'manha' | 'tarde' | 'noite' | 'dia'>('manha');
  const [showHabitForm, setShowHabitForm] = useState(false);

  // New Agenda Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPurpose, setNewTaskPurpose] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'alta' | 'media' | 'baixa'>('media');
  const [newTaskCategory, setNewTaskCategory] = useState('ansiedade');
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Custom User Quotes section
  const [customQuote, setCustomQuote] = useState<string>('');

  // Loaded database from Storage on Mount
  useEffect(() => {
    // 1. Habits
    const cachedHabits = localStorage.getItem(`elo_habits_${email}`);
    if (cachedHabits) {
      try {
        setHabits(JSON.parse(cachedHabits));
      } catch (e) {
        setHabits(DEFAULT_HABITS);
      }
    } else {
      setHabits(DEFAULT_HABITS);
    }

    // 2. Tasks
    const cachedTasks = localStorage.getItem(`elo_tasks_${email}`);
    if (cachedTasks) {
      try {
        setTasks(JSON.parse(cachedTasks));
      } catch (e) {
        setTasks(DEFAULT_TASKS);
      }
    } else {
      setTasks(DEFAULT_TASKS);
    }

    // 3. Reminders
    const cachedReminders = localStorage.getItem(`elo_reminders_${email}`);
    if (cachedReminders) {
      try {
        setReminders(JSON.parse(cachedReminders));
      } catch (e) {
        setReminders(DEFAULT_REMINDERS);
      }
    } else {
      setReminders(DEFAULT_REMINDERS);
    }

    // Pick random calming quote to show
    const calmingQuotes = [
      '"O fruto do espírito é amor, alegria, paz, longanimidade, benignidade, bondade, fidelidade, mansidão, autodomínio."',
      '"Melhor é o que domina o seu próprio espírito do que o que toma uma cidade."',
      '"A quietude mansa vale mais do que banquetes sustentados por discórdia e orgulho."',
      '"Há tempo para todo o propósito debaixo do sol. Pare um pouco e confie na ordem sagrada."',
      '"As vossas palavras sejam doces como o mel, trazendo medicina para o coração inquieto e luz para a mente."'
    ];
    setCustomQuote(calmingQuotes[Math.floor(Math.random() * calmingQuotes.length)]);
  }, [email]);

  // Persistors helpers
  const saveHabits = (newVal: PersonalHabit[]) => {
    setHabits(newVal);
    localStorage.setItem(`elo_habits_${email}`, JSON.stringify(newVal));
  };

  const saveTasks = (newVal: RoutineTask[]) => {
    setTasks(newVal);
    localStorage.setItem(`elo_tasks_${email}`, JSON.stringify(newVal));
  };

  const saveReminders = (newVal: HealthyReminder[]) => {
    setReminders(newVal);
    localStorage.setItem(`elo_reminders_${email}`, JSON.stringify(newVal));
  };

  // Toggle Habits Status on TodayDate
  const handleToggleHabit = (habitId: string) => {
    const updated = habits.map(h => {
      if (h.id === habitId) {
        const historyCopy = { ...h.history };
        const isCurrentlyDone = !!historyCopy[todayKey];
        
        if (isCurrentlyDone) {
          historyCopy[todayKey] = false;
          return {
            ...h,
            history: historyCopy,
            streak: Math.max(0, h.streak - 1)
          };
        } else {
          historyCopy[todayKey] = true;
          return {
            ...h,
            history: historyCopy,
            streak: h.streak + 1
          };
        }
      }
      return h;
    });

    saveHabits(updated);
  };

  // Delete Habit
  const handleDeleteHabit = (id: string) => {
    const next = habits.filter(h => h.id !== id);
    saveHabits(next);
  };

  // Add Custom Habit
  const handleAddNewHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;

    const fresh: PersonalHabit = {
      id: `h-${Date.now()}`,
      title: newHabitTitle.trim(),
      purpose: newHabitPurpose.trim() || 'Cultivar prumo e harmonia ativa',
      category: newHabitCategory,
      preferredTime: newHabitTime,
      streak: 0,
      history: {}
    };

    saveHabits([...habits, fresh]);
    setNewHabitTitle('');
    setNewHabitPurpose('');
    setShowHabitForm(false);
  };

  // Toggle Agenda Task status
  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });
    saveTasks(updated);
  };

  // Delete Agenda Task
  const handleDeleteTask = (taskId: string) => {
    const next = tasks.filter(t => t.id !== taskId);
    saveTasks(next);
  };

  // Add Agenda Task
  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const fresh: RoutineTask = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      purpose: newTaskPurpose.trim() || 'Fortalecer a direção e clareza pessoal',
      priority: newTaskPriority,
      dayOfWeek: activeDaySelector,
      completed: false,
      category: newTaskCategory
    };

    saveTasks([...tasks, fresh]);
    setNewTaskTitle('');
    setNewTaskPurpose('');
    setShowTaskForm(false);
  };

  // Toggle Reminder Enablement
  const handleToggleReminder = (id: string) => {
    const updated = reminders.map(r => {
      if (r.id === id) {
        return { ...r, enabled: !r.enabled };
      }
      return r;
    });
    saveReminders(updated);
  };

  // Add Custom Reminder
  const [newRemTime, setNewRemTime] = useState('12:00');
  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemMsg, setNewRemMsg] = useState('');
  const [showReminderForm, setShowReminderForm] = useState(false);

  const handleAddNewReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim() || !newRemMsg.trim()) return;

    const fresh: HealthyReminder = {
      id: `r-${Date.now()}`,
      time: newRemTime,
      title: newRemTitle.trim(),
      message: newRemMsg.trim(),
      category: 'personal',
      enabled: true
    };

    saveReminders([...reminders, fresh]);
    setNewRemTitle('');
    setNewRemMsg('');
    setShowReminderForm(false);
  };

  // Delete Reminder
  const handleDeleteReminder = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    saveReminders(updated);
  };

  // Filters
  const filteredHabits = habits.filter(h => themeFilter === 'all' || h.category === themeFilter);
  const filteredTasks = tasks.filter(t => t.dayOfWeek === activeDaySelector && (themeFilter === 'all' || t.category === themeFilter));

  // Compute Stats for today
  const habitsDoneCount = habits.filter(h => !!h.history[todayKey]).length;
  const totalHabitsCount = habits.length;
  const taskDoneCountForDay = tasks.filter(t => t.dayOfWeek === activeDaySelector && t.completed).length;
  const totalTasksCountForDay = tasks.filter(t => t.dayOfWeek === activeDaySelector).length;

  // Render mock SVG of habit progress of last 7 days (Crafted dynamic visualization)
  const renderHabitProgressSVG = () => {
    // Collect done status per day of week
    const resultPctByDay = [0, 0, 0, 0, 0, 0, 0];
    const habitCount = habits.length || 1;
    
    // For each past date key (relative to day index)
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - (6 - i));
      const pastKey = pastDate.toISOString().split('T')[0];
      const pastDayOfWeek = pastDate.getDay();
      
      const countDone = habits.filter(h => !!h.history[pastKey]).length;
      resultPctByDay[pastDayOfWeek] = Math.round((countDone / habitCount) * 100);
    }

    const maxChartHeight = 80;
    const barWidth = 30;
    const padding = 12;

    return (
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BarChart2 size={15} className="text-rose-500" />
            <span className="text-xs font-bold text-slate-700">Consistência dos Últimos 7 Dias</span>
          </div>
          <span className="text-[10px] text-slate-400">Total de hábitos diários ativos: {totalHabitsCount}</span>
        </div>

        <div className="flex justify-center pt-2">
          <svg width="100%" height="110" viewBox="0 0 310 110" className="overflow-visible">
            {DAYS_OF_WEEK_LABELS.map((day, idx) => {
              // Align each bar nicely
              const xPos = padding + idx * (barWidth + 10);
              const donePct = resultPctByDay[day.num];
              const barHeight = (donePct / 100) * maxChartHeight;
              const yPos = maxChartHeight - barHeight + 10;
              const isCurrent = day.num === currentDayOfWeekNum;

              return (
                <g key={day.num}>
                  {/* Background pill track */}
                  <rect
                    x={xPos}
                    y={10}
                    width={barWidth}
                    height={maxChartHeight}
                    rx="6"
                    fill="#f1f5f9"
                  />
                  {/* Interactive Fill color */}
                  <rect
                    x={xPos}
                    y={yPos}
                    width={barWidth}
                    height={barHeight}
                    rx="6"
                    fill={isCurrent ? '#f43f5e' : donePct > 50 ? '#fda4af' : '#fecdd3'}
                    className="transition-all duration-500 ease-out hover:opacity-90"
                  />
                  {/* Tooltip text % */}
                  <text
                    x={xPos + barWidth / 2}
                    y={yPos - 4}
                    textAnchor="middle"
                    fill={isCurrent ? '#f43f5e' : '#94a3b8'}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {donePct}%
                  </text>
                  {/* Day label */}
                  <text
                    x={xPos + barWidth / 2}
                    y={maxChartHeight + 25}
                    textAnchor="middle"
                    fill={isCurrent ? '#f43f5e' : '#64748b'}
                    fontSize="9"
                    fontWeight={isCurrent ? 'bold' : 'normal'}
                  >
                    {day.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto pb-24">
      
      {/* 1. SEED QUOTE & INTRO */}
      <div className="bg-gradient-to-br from-rose-900 to-slate-800 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-8 translate-x-10 text-white/5 font-extrabold text-[120px] select-none pointer-events-none">
          ✨
        </div>
        
        <div className="space-y-4 relative">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest text-white/95">
            <Sparkles size={11} className="text-amber-400" />
            Organização com Alma & Sentido
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold tracking-tight">Caminho da Constância</h2>
            <p className="text-xs text-rose-100/90 leading-relaxed italic max-w-md">
              {customQuote}
            </p>
          </div>

          <div className="flex border-t border-white/10 pt-4 items-center justify-between text-[10.5px] text-rose-100">
            <span>Seu desempenho diário:</span>
            <span className="font-extrabold bg-white/10 px-2.5 py-1 rounded-lg">
              {habitsDoneCount}/{totalHabitsCount} Hábitos Feitos Hoje
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN CATEGORY PILL FILTER */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const isSelected = themeFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setThemeFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                isSelected 
                  ? 'border-rose-500 bg-rose-500 text-white shadow-sm' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. CORE SUB-MENU ROUTINE VIEW SELECTION */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
        <button
          onClick={() => setInnerTab('dailies')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            innerTab === 'dailies' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Agenda & Tarefas
        </button>
        <button
          onClick={() => setInnerTab('habits')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            innerTab === 'habits' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Hábitos & Progresso
        </button>
        <button
          onClick={() => setInnerTab('reminders')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            innerTab === 'reminders' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Lembretes da Mente
        </button>
      </div>

      {/* 4. RENDER INNER WORKPLACE MODULES */}

      {/* 4A. PLANO DIÁRIO & TIMELINE CHECKLIST INTERFACES */}
      {innerTab === 'dailies' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Weekday selective tabs to construct integrated planner */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Planejador Semanal Integrado</p>
            <div className="flex gap-1.5 relative justify-between">
              {DAYS_OF_WEEK_LABELS.map((day) => {
                const isSelected = activeDaySelector === day.num;
                const tasksOnDay = tasks.filter(t => t.dayOfWeek === day.num);
                const countDoneOnDay = tasksOnDay.filter(t => t.completed).length;

                return (
                  <button
                    key={day.num}
                    onClick={() => setActiveDaySelector(day.num)}
                    className={`flex-1 flex flex-col items-center p-2 rounded-xl transition-all border ${
                      isSelected 
                        ? 'bg-rose-50 border-rose-300 text-rose-600 scale-102 font-bold shadow-sm' 
                        : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider">{day.short}</span>
                    <span className="text-xs">{day.num === currentDayOfWeekNum ? 'Hoje' : day.label}</span>
                    
                    {/* Visual indicators of tasks */}
                    {tasksOnDay.length > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        countDoneOnDay === tasksOnDay.length ? 'bg-emerald-400' : 'bg-rose-400'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action List & Checkboxes container */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Checklist Inteligente</h4>
                <p className="text-[10px] text-slate-400">Tarefas prioritárias organizadas por dia de ação</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 hover:bg-rose-50 transition-colors rounded-xl px-2.5 py-1 flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500">
                  {taskDoneCountForDay}/{totalTasksCountForDay} Feito
                </span>
              </div>
            </div>

            {/* List of actions mapped */}
            {filteredTasks.length > 0 ? (
              <div className="space-y-2.5">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`group border rounded-2xl p-3.5 flex items-start gap-3 transition-all hover:bg-slate-50/50 ${
                      task.completed ? 'border-slate-100 opacity-60' : 'border-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-0.5 text-rose-500 hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                    >
                      {task.completed ? (
                        <CheckSquare size={18} fill="currentColor" stroke="white" />
                      ) : (
                        <Square size={18} className="text-slate-300 hover:text-rose-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold leading-relaxed break-words ${
                          task.completed ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}>
                          {task.title}
                        </span>
                        
                        {/* Priority Pill bubble */}
                        <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          task.priority === 'alta' ? 'bg-rose-50 text-rose-500' :
                          task.priority === 'media' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {task.priority}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-snug flex items-center gap-1">
                        <Sparkles size={11} className="text-rose-400" strokeWidth={2.5} />
                        Motivação: {task.purpose}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Excluir tarefa"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-7 space-y-2">
                <p className="text-xs text-slate-400 italic">Nenhuma ação planejada para este dia.</p>
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 font-bold text-[10px] uppercase py-2 px-4 rounded-xl transition-colors inline-block"
                >
                  Criar Primeiro Objetivo
                </button>
              </div>
            )}

            {/* Hidden Add Task Form Panel toggle */}
            {!showTaskForm ? (
              <button
                onClick={() => setShowTaskForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-200 hover:border-rose-300 rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-500 bg-white hover:bg-rose-50/20 active:scale-99 transition-all"
              >
                <Plus size={14} /> Adicionar Ação Necessária
              </button>
            ) : (
              <form onSubmit={handleAddNewTask} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5 text-left animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nova Ação Planejada</span>
                  <button 
                    type="button" 
                    onClick={() => setShowTaskForm(false)} 
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">O que fazer?</label>
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ex: Fazer intervalo para dar as boas-vindas ao silêncio"
                    className="w-full bg-white rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">O que motiva esta ação? (Propósito)</label>
                  <input
                    type="text"
                    value={newTaskPurpose}
                    onChange={(e) => setNewTaskPurpose(e.target.value)}
                    placeholder="Ex: Para desfazer os nós de autocobrança excessiva"
                    className="w-full bg-white rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pb-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nível de Prioridade</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e: any) => setNewTaskPriority(e.target.value)}
                      className="w-full bg-white rounded-xl border border-slate-200 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tema Emocional</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="w-full bg-white rounded-xl border border-slate-200 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                    >
                      <option value="ansiedade">Ansiedade / Paz</option>
                      <option value="autoestima">Autoestima / Valor</option>
                      <option value="disciplina">Foco / Disciplina</option>
                      <option value="relacionamentos">Apoio / Relacionamentos</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition-colors"
                >
                  Fixar na Agenda da Semana
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* 4B. SISTEMA DE HÁBITOS POSITIVOS & PRODUTIVIDADE LEVE (PROGRESS TRACKERS) */}
      {innerTab === 'habits' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Calming interactive checklist */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-50">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Rituais do Dia Sábio</h4>
                <p className="text-[10px] text-slate-400">Hábitos simples de consagração e afeto pessoal</p>
              </div>

              <span className="text-[10px] bg-emerald-50 text-emerald-600 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Hoje: {habitsDoneCount}/{totalHabitsCount} Concluído
              </span>
            </div>

            {/* Category Habits checklist list */}
            {filteredHabits.length > 0 ? (
              <div className="space-y-3.5">
                {filteredHabits.map((habit) => {
                  const isDoneToday = !!habit.history[todayKey];
                  return (
                    <div
                      key={habit.id}
                      className="group flex items-start gap-4 p-1.5 relative hover:bg-slate-50/40 rounded-2xl transition-all"
                    >
                      <button
                        onClick={() => handleToggleHabit(habit.id)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isDoneToday 
                            ? 'bg-rose-500 text-white shadow shadow-rose-200 scale-95' 
                            : 'bg-slate-50 border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500'
                        }`}
                        title={isDoneToday ? 'Desmarcar hábito no dia' : 'Concluir hábito de hoje'}
                      >
                        {isDoneToday ? <CheckCircle2 size={18} /> : <span>{habit.preferredTime === 'manha' ? '🌅' : habit.preferredTime === 'tarde' ? '☀️' : habit.preferredTime === 'noite' ? '🌙' : '✨'}</span>}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className={`text-xs font-bold leading-relaxed truncate ${
                            isDoneToday ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}>
                            {habit.title}
                          </h5>
                          
                          {habit.streak > 0 && (
                            <span className="bg-amber-50 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              🔥 {habit.streak}d
                            </span>
                          )}
                        </div>

                        <p className="text-[10.5px] text-slate-400 leading-snug">
                          {habit.purpose}
                        </p>
                        
                        <p className="text-[8px] text-rose-500 uppercase tracking-widest font-extrabold mt-0.5">
                          Foco: {habit.category} • Período sugerido: {habit.preferredTime}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        title="Excluir hábito permanente"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">Nenhum hábito rastreado neste tema.</p>
            )}

            {/* Custom Habit addition toggle form */}
            {!showHabitForm ? (
              <button
                onClick={() => setShowHabitForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-200 hover:border-rose-300 rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-500 bg-white hover:bg-rose-50/20 active:scale-99 transition-all"
              >
                <Plus size={14} /> Integrar Novo Hábito Amoroso
              </button>
            ) : (
              <form onSubmit={handleAddNewHabit} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5 text-left animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuração do Novo Hábito</span>
                  <button 
                    type="button" 
                    onClick={() => setShowHabitForm(false)} 
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Voltar
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hábito Singular</label>
                  <input
                    type="text"
                    required
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                    placeholder="Ex: Beber 300ml de água ouvindo os passarinhos"
                    className="w-full bg-white rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Qual é o propósito por trás desse ritual?</label>
                  <input
                    type="text"
                    value={newHabitPurpose}
                    onChange={(e) => setNewHabitPurpose(e.target.value)}
                    placeholder="Ex: Nutrir cuidado integral com o corpo sem ansiedade"
                    className="w-full bg-white rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pb-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Melhor Momento</label>
                    <select
                      value={newHabitTime}
                      onChange={(e: any) => setNewHabitTime(e.target.value)}
                      className="w-full bg-white rounded-xl border border-slate-200 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                    >
                      <option value="manha">🌅 Manhã (Despertar)</option>
                      <option value="tarde">☀️ Tarde (Interlúdio)</option>
                      <option value="noite">🌙 Noite (Repousar)</option>
                      <option value="dia">✨ Ao longo do dia</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Relação Temática</label>
                    <select
                      value={newHabitCategory}
                      onChange={(e) => setNewHabitCategory(e.target.value)}
                      className="w-full bg-white rounded-xl border border-slate-200 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                    >
                      <option value="ansiedade">Ansiedade / Calma</option>
                      <option value="autoestima">Autoestima / Respeito</option>
                      <option value="disciplina">Foco / Autodomínio</option>
                      <option value="relacionamentos">Convivência / Ternura</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition-colors"
                >
                  Confirmar e Alistar Estabelecido
                </button>
              </form>
            )}
          </div>

          {/* 4B-II. RENDERS THE PROGRESS METRICS OVERVIEW */}
          {renderHabitProgressSVG()}

        </div>
      )}

      {/* 4C. LEMBRETES E NOTIFICAÇÕES GENTIS (DAILY COMPASSION ALERTS) */}
      {innerTab === 'reminders' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-1 inline-flex w-full">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm">Bússola de Alertas Saudáveis</h4>
                <p className="text-[10px] text-slate-400">Notificações internas gentis para suspender inquietações do dia</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal bg-slate-50 p-3 rounded-xl border border-slate-100/70 italic">
              "Para desarmar a tensão, configure alertas curtos de pausa. O aplicativo emitirá sugestões de respiração e reflexões mansas nos horários oportunos."
            </p>

            <div className="space-y-3 pt-2">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`border rounded-2xl p-4 flex items-start gap-3.5 transition-all ${
                    reminder.enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold">
                    {reminder.time}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-700">{reminder.title}</h5>
                      
                      {/* Interactive toggle switch styled in Tailwind */}
                      <button
                        onClick={() => handleToggleReminder(reminder.id)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${
                          reminder.enabled ? 'bg-rose-500' : 'bg-slate-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                          reminder.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed italic mt-1 font-serif">
                      {reminder.message}
                    </p>
                  </div>

                  {reminder.category === 'personal' && (
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-slate-300 hover:text-rose-600 p-1"
                      title="Excluir alerta"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Custom Reminder addition form */}
            {!showReminderForm ? (
              <button
                onClick={() => setShowReminderForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-200 hover:border-rose-300 rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-500 bg-white hover:bg-rose-50/20 active:scale-99 transition-all"
              >
                <Plus size={14} /> Personalizar Alerta de Calma
              </button>
            ) : (
              <form onSubmit={handleAddNewReminder} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3.5 text-left animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Novo Alerta de Repouso</span>
                  <button 
                    type="button" 
                    onClick={() => setShowReminderForm(false)} 
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Voltar
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Horário</label>
                    <input
                      type="time"
                      required
                      value={newRemTime}
                      onChange={(e) => setNewRemTime(e.target.value)}
                      className="w-full bg-white rounded-xl border border-slate-200 py-2 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Título do Lembrete</label>
                    <input
                      type="text"
                      required
                      value={newRemTitle}
                      onChange={(e) => setNewRemTitle(e.target.value)}
                      placeholder="Ex: Hora de respirar leve"
                      className="w-full bg-white rounded-xl border border-slate-200 py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mensagem Consoladora do Elo</label>
                  <textarea
                    rows={2}
                    required
                    value={newRemMsg}
                    onChange={(e) => setNewRemMsg(e.target.value)}
                    placeholder="Ex: 'Pare por 1 minuto. Respire em 4 segundos e pense em uma virtude.'"
                    className="w-full bg-white rounded-xl border border-slate-200 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-wider shadow-sm transition-colors"
                >
                  Ativar Alerta de Conexão
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
