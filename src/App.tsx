import React, { useState, useEffect } from 'react';
import { ViewMode, UserSession } from './types';
import Layout from './components/Layout';
import ChatView from './components/ChatView';
import BreathingExercise from './components/BreathingExercise';
import DiaryView from './components/DiaryView';
import AboutView from './components/AboutView';
import { DiagnosticView } from './components/DiagnosticView';
import { LibraryView } from './components/LibraryView';
import { RoutineView } from './components/RoutineView';
import { AuthView } from './components/AuthView';
import { authService, dbService } from './utils/supabase';
import { SubscriptionService } from './utils/subscriptionService';
import { Sparkles, Trophy, ShieldCheck, CreditCard } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [voicePreference] = useState<'masculine' | 'feminine' | null>('masculine');

  // Check login session on mount and set up real-time validation / session sync
  useEffect(() => {
    const checkActiveSession = async () => {
      // Fast check local storage initially to avoid loading flickers
      const stored = localStorage.getItem('elo_current_session');
      if (stored) {
        try {
          const parsed: UserSession = JSON.parse(stored);
          const profile = await dbService.getProfile(parsed.id || parsed.email, parsed.email);
          const activeSession: UserSession = {
            id: parsed.id || parsed.email,
            email: parsed.email,
            firstLoginAt: profile.created_at,
            trialExpiresAt: profile.trial_expires_at,
            isPremiumSubscriber: profile.is_premium,
            plano: profile.plano,
            status_assinatura: profile.status_assinatura,
            subscription_id: profile.subscription_id
          };
          setSession(activeSession);
        } catch (e) {
          console.warn('Initial session restore check avoided:', e);
        }
      }
    };

    checkActiveSession();

    // Subscribe to auth events and load user profile if session exists
    const unsubscribe = authService.onAuthStateChange(async (event, authSession) => {
      if (authSession?.user) {
        const user = authSession.user;
        const profile = await dbService.getProfile(user.id || user.email, user.email || '');
        
        const currentSession: UserSession = {
          id: user.id || user.email,
          email: user.email || '',
          firstLoginAt: profile.created_at,
          trialExpiresAt: profile.trial_expires_at,
          isPremiumSubscriber: profile.is_premium,
          plano: profile.plano,
          status_assinatura: profile.status_assinatura,
          subscription_id: profile.subscription_id
        };
        
        setSession(currentSession);
      } else {
        setSession(null);
      }
    });

    // Real-time loop (runs every 5 seconds) to ensure subscription & session sync is instantaneous
    const intervalId = setInterval(checkActiveSession, 5000);

    return () => {
      clearInterval(intervalId);
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleAuthSuccess = (newSession: UserSession) => {
    setSession(newSession);
  };

  const handleLogout = async () => {
    await authService.signOut(session?.email);
    setSession(null);
  };

  // Robust Route Protection configuration
  const isPublicView = activeView === 'breathing' || activeView === 'about';

  // Guard blocks:
  // 1. If not logged in and trying to access a private view:
  if (!session && !isPublicView) {
    return (
      <AuthView 
        session={session} 
        onAuthSuccess={handleAuthSuccess} 
        onLogout={handleLogout} 
      />
    );
  }

  const handleSimulatedUpgrade = async () => {
    if (!session) return;
    const infiniteFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const success = await dbService.updateSubscription(session.id || session.email, true, 'active', 'premium', infiniteFuture);
    if (success) {
      const updatedSession: UserSession = {
        ...session,
        isPremiumSubscriber: true,
        plano: 'premium',
        status_assinatura: 'active',
        trialExpiresAt: infiniteFuture,
        plan: 'premium',
        subscription_status: 'active'
      };
      setSession(updatedSession);
      alert('Parabéns! Sua assinatura Elo Premium foi simulada e liberada com sucesso!');
    }
  };

  const renderView = () => {
    const isAuthorized = SubscriptionService.canAccessView(activeView, session);
    
    if (session && !isAuthorized) {
      const displayLabel = 
        activeView === 'routine' ? 'Rotinas Diárias' :
        activeView === 'diagnostic' ? 'Avaliação de Vida' :
        activeView === 'library' ? 'Aulas de Bem-Estar' : 'Recurso Restrito';

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-100 shadow-xl animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-inner">
            <Sparkles size={32} className="animate-pulse" strokeWidth={1.5} />
          </div>
          <div className="space-y-2 col-span-1">
            <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Plano Premium Elo
            </span>
            <h3 className="text-xl font-bold text-slate-800">Desbloqueie {displayLabel}</h3>
            <p className="text-sm text-slate-500 leading-relaxed px-2">
              Esta funcionalidade avançada faz parte do Plano Premium. Faça o upgrade agora para ter acesso completo a relatórios, aulas guiadas, rotinas personalizadas e conversas ilimitadas de voz.
            </p>
          </div>
          
          <div className="w-full space-y-3 pt-2">
            <button
              onClick={handleSimulatedUpgrade}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold py-3.5 rounded-2xl text-sm shadow-md transition-all active:scale-95"
            >
              <CreditCard size={18} />
              Ativar Elo Premium R$19,90/mês
            </button>
            <p className="text-[10px] text-slate-400">
              Ambiente de testes: Clique acima para simular a confirmação do de pagamento e liberar o acesso.
            </p>
          </div>
        </div>
      );
    }

    switch (activeView) {
      case 'chat':
        return <ChatView voicePreference={voicePreference} session={session} />;
      case 'breathing':
        return <BreathingExercise />;
      case 'diagnostic':
        return <DiagnosticView session={session!} />;
      case 'library':
        return <LibraryView session={session!} />;
      case 'routine':
        return <RoutineView session={session!} />;
      case 'diary':
        return <DiaryView session={session!} />;
      case 'about':
        return <AboutView />;
      default:
        return <ChatView voicePreference={voicePreference} session={session} />;
    }
  };

  return (
    <Layout 
      session={session}
      activeView={activeView} 
      onViewChange={setActiveView} 
      onLogout={handleLogout}
    >
      {renderView()}
    </Layout>
  );
};

export default App;

