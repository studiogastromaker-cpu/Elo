import React, { useState, useEffect } from 'react';
import { BreathingState } from '../types';
import { Play, Pause, RotateCcw, Wind, Sparkles, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BreathingProfile {
  name: string;
  description: string;
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

const PROFILES: BreathingProfile[] = [
  {
    name: 'Respiração Quadrada',
    description: 'Ritmo clássico 4-4-4-4 para reduzir a ansiedade e ativar o foco imediato.',
    inhale: 4,
    holdIn: 4,
    exhale: 4,
    holdOut: 4
  },
  {
    name: 'Alívio Profundo 4-7-8',
    description: 'Desacelera os batimentos e relaxa a mente para um sono restaurador.',
    inhale: 4,
    holdIn: 7,
    exhale: 8,
    holdOut: 0
  },
  {
    name: 'Coerência Cardíaca',
    description: 'Ritmo contínuo de 5 segundos para estabilizar as emoções com equilíbrio.',
    inhale: 5,
    holdIn: 0,
    exhale: 5,
    holdOut: 0
  }
];

const BreathingExercise: React.FC = () => {
  const [profileIndex, setProfileIndex] = useState(0);
  const profile = PROFILES[profileIndex];

  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<BreathingState>(BreathingState.HOLDING_OUT);
  const [timer, setTimer] = useState(4);
  const [cycleCount, setCycleCount] = useState(0);

  const getStageDuration = (st: BreathingState): number => {
    switch (st) {
      case BreathingState.INHALING: return profile.inhale;
      case BreathingState.HOLDING_IN: return profile.holdIn;
      case BreathingState.EXHALING: return profile.exhale;
      case BreathingState.HOLDING_OUT: return profile.holdOut;
      default: return 4;
    }
  };

  const currentDuration = getStageDuration(state);

  const getNextStateAndDuration = (current: BreathingState): { nextState: BreathingState; duration: number } => {
    let checkState = current;
    for (let i = 0; i < 4; i++) {
      if (checkState === BreathingState.HOLDING_OUT) checkState = BreathingState.INHALING;
      else if (checkState === BreathingState.INHALING) checkState = BreathingState.HOLDING_IN;
      else if (checkState === BreathingState.HOLDING_IN) checkState = BreathingState.EXHALING;
      else if (checkState === BreathingState.EXHALING) checkState = BreathingState.HOLDING_OUT;
      
      const d = getStageDuration(checkState);
      if (d > 0) {
        return { nextState: checkState, duration: d };
      }
    }
    return { nextState: BreathingState.INHALING, duration: profile.inhale };
  };

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            const result = getNextStateAndDuration(state);
            setState(result.nextState);
            
            // If we complete a full loop (from EXHALING/HOLDING_OUT back to INHALING), increment cycle
            if (result.nextState === BreathingState.INHALING) {
              setCycleCount(c => c + 1);
            }
            return result.duration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, state, profileIndex]);

  // Reset exercise if profile changes
  useEffect(() => {
    reset();
  }, [profileIndex]);

  const toggleExercise = () => {
    if (!isActive) {
      const startInhaleDuration = getStageDuration(BreathingState.INHALING);
      setState(BreathingState.INHALING);
      setTimer(startInhaleDuration);
    }
    setIsActive(!isActive);
  };

  const reset = () => {
    setIsActive(false);
    const initialDuration = getStageDuration(BreathingState.HOLDING_OUT) || 4;
    setTimer(initialDuration);
    setCycleCount(0);
    setState(BreathingState.HOLDING_OUT);
  };

  const getEmotionalInstruction = () => {
    if (!isActive) return 'Escolha um ritmo abaixo e sinta a leveza fluir';
    switch (state) {
      case BreathingState.INHALING:
        return 'Encha seus pulmões de ar e sinta a vida...';
      case BreathingState.HOLDING_IN:
        return 'Segure o ar, repouse na plenitude...';
      case BreathingState.EXHALING:
        return 'Solte lentamente, dissipando as tensões...';
      case BreathingState.HOLDING_OUT:
        return 'Aguarde o novo ciclo no silêncio interno...';
      default:
        return 'Sinta a sua respiração fluir...';
    }
  };

  // Compute values for organic motion
  const isExpanded = state === BreathingState.INHALING || state === BreathingState.HOLDING_IN;
  const currentLevelScale = isExpanded ? 1.55 : 1.0;
  
  // Custom transition speed based on phase duration
  const scaleTransitionDuration = state === BreathingState.INHALING 
    ? profile.inhale 
    : state === BreathingState.EXHALING 
    ? profile.exhale 
    : 0.5;

  return (
    <div className="h-full flex flex-col items-center justify-start p-4 md:p-8 bg-transparent overflow-y-auto pb-24">
      {/* Title Header */}
      <div className="text-center mt-3 mb-8 space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
          <Wind className="text-rose-500 animate-pulse" size={24} />
          Respiração Consciente
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Técnicas de inspiração milenar para equilibrar seus sentimentos e restaurar seu manto de calma.
        </p>
      </div>

      {/* Profile Selector tabs */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap justify-center gap-1.5 max-w-md w-full mb-10 border border-slate-200/50">
        {PROFILES.map((p, idx) => (
          <button
            key={idx}
            onClick={() => setProfileIndex(idx)}
            className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition-all truncate border ${
              profileIndex === idx
                ? 'bg-white text-rose-600 shadow-sm border-slate-200'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            {p.name.split(' (')[0]}
          </button>
        ))}
      </div>

      {/* Main Breathing Stage Circle */}
      <div className="relative flex items-center justify-center w-64 h-64 mb-10">
        <AnimatePresence>
          {isActive && (
            <>
              {/* Harmonic Expansion Aura 1 */}
              <motion.div
                initial={{ scale: 1, opacity: 0.15 }}
                animate={{ 
                  scale: currentLevelScale * 1.3, 
                  opacity: isExpanded ? 0.08 : 0.03 
                }}
                transition={{ duration: scaleTransitionDuration, ease: 'easeInOut' }}
                className="absolute w-full h-full bg-rose-400 rounded-full"
              />
              {/* Harmonic Expansion Aura 2 */}
              <motion.div
                initial={{ scale: 1, opacity: 0.25 }}
                animate={{ 
                  scale: currentLevelScale * 1.15, 
                  opacity: isExpanded ? 0.18 : 0.08 
                }}
                transition={{ duration: scaleTransitionDuration, ease: 'easeInOut' }}
                className="absolute w-full h-full bg-rose-300 rounded-full"
              />
            </>
          )}
        </AnimatePresence>
        
        {/* Core Breathing Sphere with custom physical scaling */}
        <motion.div
          animate={{ scale: currentLevelScale }}
          transition={{ 
            duration: scaleTransitionDuration, 
            ease: "easeInOut" 
          }}
          className={`relative w-40 h-40 bg-gradient-to-tr from-rose-500 to-rose-400 rounded-full shadow-xl flex flex-col items-center justify-center text-white cursor-pointer z-10 hover:shadow-2xl hover:brightness-105 active:scale-95 transition-all`}
          onClick={toggleExercise}
        >
          {isActive ? (
            <div className="flex flex-col items-center justify-center select-none text-center">
              <motion.span 
                key={timer}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-4xl font-extrabold font-accent drop-shadow-md"
              >
                {timer}
              </motion.span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-rose-100 opacity-80 mt-1">segundos</span>
            </div>
          ) : (
            <Wind size={48} className="animate-pulse" />
          )}
        </motion.div>
      </div>

      {/* Status Instruction and Subtitles */}
      <div className="text-center mb-8 h-16 max-w-sm px-6 flex flex-col justify-center">
        {isActive ? (
          <div className="space-y-1">
            <motion.p 
              key={state}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-black text-rose-600 font-accent tracking-wide"
            >
              {state}
            </motion.p>
            <p className="text-xs text-slate-400 italic">
              {getEmotionalInstruction()}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-slate-700 font-bold text-sm">Pronto para iniciar?</p>
            <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
              "{profile.name}": {profile.description}
            </p>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-6 z-10">
        <button
          onClick={reset}
          disabled={!isActive && cycleCount === 0}
          className="p-3.5 rounded-2xl bg-white border border-slate-200/60 text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-white disabled:text-slate-300 transition-all shadow-sm flex items-center justify-center active:scale-95"
          title="Reiniciar exercício"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={toggleExercise}
          className={`px-12 py-3.5 rounded-full font-bold text-sm uppercase tracking-wider shadow-md active:scale-[0.98] transition-all flex items-center gap-2 ${
            isActive 
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800' 
              : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200'
          }`}
        >
          {isActive ? <><Pause size={16} fill="currentColor" /> Pausar</> : <><Play size={16} fill="currentColor" /> Praticar</>}
        </button>
      </div>

      {/* Completed Cycle Indicator Badge */}
      {cycleCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 bg-emerald-50 text-emerald-600 border border-emerald-100/50 py-2 px-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm"
        >
          <Activity size={12} />
          {cycleCount} {cycleCount === 1 ? 'Ciclo Concluído' : 'Ciclos Concluídos'}
        </motion.div>
      )}
    </div>
  );
};

export default BreathingExercise;
