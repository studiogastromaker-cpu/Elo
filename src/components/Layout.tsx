import React from 'react';
import { ViewMode, UserSession } from '../types';
import { MessageCircle, Wind, BookHeart, Info, Heart, Settings2, LogOut, ShieldCheck, Compass, BookOpen, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';
// @ts-ignore
import celestialBg from '../assets/images/celestial_light_1779812472952.png';
import { SubscriptionService } from '../utils/subscriptionService';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  session: UserSession | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange, session, onLogout }) => {
  const navItems = [
    { id: 'chat', label: 'Conversar', icon: MessageCircle },
    { id: 'breathing', label: 'Respirar', icon: Wind },
    { id: 'diagnostic', label: 'Avaliar', icon: Compass },
    { id: 'library', label: 'Aulas', icon: BookOpen },
    { id: 'routine', label: 'Rotina', icon: ListTodo },
    { id: 'diary', label: 'Diário', icon: BookHeart },
    { id: 'about', label: 'Sobre', icon: Info },
  ];

  const getRemainingDays = () => {
    if (!session || !session.trialExpiresAt) return 0;
    const diffTime = new Date(session.trialExpiresAt).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const remainingDays = getRemainingDays();
  const permissions = SubscriptionService.getPermissions(session);

  return (
    <div className="flex flex-col h-[100dvh] max-w-4xl mx-auto bg-white shadow-sm overflow-hidden border-x border-slate-100 pb-[safe-area-inset-bottom]">
      {/* Glassmorphic Header */}
      <header className="p-4 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-inner">
            <Heart size={24} fill="currentColor" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Elo</h1>
              {session ? (
                permissions.planType === 'premium' ? (
                  <span className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-0.5 shadow-sm">
                    ✨ Assinante Premium
                  </span>
                ) : permissions.planType === 'trial' ? (
                  <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                    ⏳ Trial: {remainingDays}d
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                    🍃 Plano Grátis
                  </span>
                )
              ) : (
                <span className="bg-slate-200 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  👤 Visitante
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Seu refúgio emocional</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {session ? (
            <button 
              onClick={onLogout}
              title="Sair da Conta"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button 
              onClick={() => onViewChange('chat')}
              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-100"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area with celestial background related to God */}
      <main 
        className="flex-1 overflow-y-auto relative bg-[#fefdfc]" 
        style={{
          backgroundImage: `url(${celestialBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'local'
        }}
      >
        {/* Soft backdrop overlay to ensure crisp contrast and reading comfort */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[0.5px] pointer-events-none z-0" />

        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-full relative z-10"
        >
          {children}
        </motion.div>
      </main>

      {/* Glassmorphic Navigation */}
      <nav className="p-2 bg-white/80 backdrop-blur-md border-t border-slate-100 flex items-center justify-around sticky bottom-0 z-30">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewMode)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 ${
                isActive 
                  ? 'text-rose-500 bg-rose-50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[8px] sm:text-[10px] font-medium uppercase tracking-normal sm:tracking-wider truncate w-full text-center">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;

