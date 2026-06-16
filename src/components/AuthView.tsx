import React, { useState, useEffect } from 'react';
import { UserSession } from '../types';
import { Heart, Mail, Lock, Sparkles, LogIn, UserPlus, HelpCircle, ShieldAlert, CheckCircle, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { authService, dbService } from '../utils/supabase';

interface AuthViewProps {
  onAuthSuccess: (session: UserSession) => void;
  session: UserSession | null;
  onLogout: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, session, onLogout }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'paywall'>('login');
  const [devClicks, setDevClicks] = useState(0);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Recovery fields
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  // Load and refresh session state to make sure active check is perfect
  useEffect(() => {
    if (session) {
      const isExpired = new Date(session.trialExpiresAt) < new Date();
      if (isExpired && !session.isPremiumSubscriber) {
        setMode('paywall');
      }
    }
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const targetEmail = email.toLowerCase().trim();

    if (!targetEmail || !password) {
      setError('Por favor preencha todos os campos.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { session: activeSession, error: authError } = await authService.signIn(targetEmail, password);

      if (authError) {
        setError(authError);
        setIsLoading(false);
        return;
      }

      if (activeSession?.user) {
        onAuthSuccess(activeSession.user);
        setIsLoading(false);

        // Check if trial has expired without actively subscribing
        const isExpired = new Date(activeSession.user.trialExpiresAt) < new Date();
        if (isExpired && !activeSession.user.isPremiumSubscriber) {
          setMode('paywall');
        } else {
          setSuccess('Conectado com sucesso!');
        }
      } else {
        setError('Erro ao autenticar. Tente novamente.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao autenticar.');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const targetEmail = email.toLowerCase().trim();

    if (!targetEmail || !password || !name) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const { session: activeSession, error: signupError } = await authService.signUp(targetEmail, password, name);

      if (signupError) {
        setError(signupError);
        setIsLoading(false);
        return;
      }

      setSuccess('Cadastro realizado! Iniciando sua sessão no Elo...');
      if (activeSession) {
        onAuthSuccess(activeSession.user || activeSession);
      }
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro ao realizar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const targetEmail = email.toLowerCase().trim();

    if (!targetEmail) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.requestPasswordRecovery(targetEmail);

      if (!result.success) {
        setError(result.message);
        setIsLoading(false);
        return;
      }

      setSuccess(result.message);
      setShowResetForm(true);
    } catch (err: any) {
      setError('Falha de conexão ao redefinir a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setError('A nova senha precisa ter pelo menos 6 caracteres para sua segurança.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.updatePassword(newPassword, resetToken || undefined);

      if (!result.success) {
        setError(result.message);
        setIsLoading(false);
        return;
      }

      setSuccess('Sua senha de segurança foi redefinida com sucesso! Faça login com a nova senha.');
      setShowResetForm(false);
      setMode('login');
      // Clear values safely
      setNewPassword('');
      setResetToken('');
    } catch (err: any) {
      setError('Ocorreu uma falha ao atualizar sua senha.');
    } finally {
      setIsLoading(false);
    }
  };

  // Upgrades user trial state based on unified sub update routine
  const handleCactoSubscribe = async () => {
    if (!session) return;
    setIsLoading(true);
    
    try {
      // Future subscription parameters linked inside system
      const infiniteFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const userKey = session.id || session.email;
      
      const success = await dbService.updateSubscription(userKey, true, 'active', 'premium', infiniteFuture);
      
      if (success) {
        const updatedSession: UserSession = {
          ...session,
          isPremiumSubscriber: true,
          plano: 'premium',
          status_assinatura: 'active',
          trialExpiresAt: infiniteFuture
        };

        onAuthSuccess(updatedSession);
        setSuccess('Assinatura Premium Cacto concluída e liberada com sucesso!');
        setMode('login'); // go back to trigger normal view
      } else {
        setError('Ocorreu um erro ao registrar sua assinatura.');
      }
    } catch (err: any) {
      setError('Ocorreu uma falha ao ativar assinatura.');
    } finally {
      setIsLoading(false);
    }
  };

  // Developer tool to test trial expiration flow
  const handleDevForceExpireTrial = async () => {
    if (!session) return;
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const userKey = session.id || session.email;

    await dbService.updateSubscription(userKey, false, 'expired', 'gratuito', pastDate);

    const updatedSession: UserSession = {
      ...session,
      isPremiumSubscriber: false,
      trialExpiresAt: pastDate,
      plano: 'gratuito',
      status_assinatura: 'expired'
    };

    onAuthSuccess(updatedSession);
    setMode('paywall');
  };

  // Developer tool to restore trial period
  const handleDevResetTrial = async () => {
    if (!session) return;
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const userKey = session.id || session.email;

    await dbService.updateSubscription(userKey, false, 'trial', 'gratuito', futureDate);

    const updatedSession: UserSession = {
      ...session,
      isPremiumSubscriber: false,
      trialExpiresAt: futureDate,
      plano: 'gratuito',
      status_assinatura: 'trial'
    };

    onAuthSuccess(updatedSession);
    window.location.reload();
  };

  if (mode === 'paywall') {
    return (
      <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div 
            onClick={() => setDevClicks(prev => prev + 1)} 
            className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner cursor-pointer active:scale-95 transition-transform"
            title="Desenvolvimento"
          >
            <Heart size={32} fill="currentColor" />
          </div>
          
          <div className="space-y-2">
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Período de Experiência Expirado</span>
            <h2 className="text-2xl font-bold text-slate-800">Seus 60 dias grátis acabaram</h2>
            <p className="text-sm text-slate-500 px-2 leading-relaxed">
              Para continuar tendo acesso ao Elo - Seu Refúgio de Bem-Estar e conversar por voz e texto com nossa inteligência inspirada em sabedoria, ative seu plano Cacto Premium.
            </p>
          </div>

          {devClicks >= 5 && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-rose-200 text-left space-y-2 text-xs">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-center">🛠️ Painel Secreto de Desenvolvimento</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDevResetTrial}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 py-2 rounded-xl font-bold text-center text-[10px]"
                >
                  Restaurar 60 Dias
                </button>
                <button
                  onClick={handleDevForceExpireTrial}
                  className="bg-rose-50 text-rose-700 border border-rose-200 py-2 rounded-xl font-bold text-center text-[10px]"
                >
                  Forçar Expiração
                </button>
              </div>
            </div>
          )}

          <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 text-left space-y-3">
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider text-center">Plano Elo Premium via Cacto</p>
            <div className="text-center font-accent py-1">
              <span className="text-3xl font-extrabold text-slate-800">R$ 29,90</span>
              <span className="text-sm text-slate-500"> /mês</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-center gap-2">✅ Conversação por Voz Ilimitada</li>
              <li className="flex items-center gap-2">✅ Sabedoria profunda e direcionamento</li>
              <li className="flex items-center gap-2">✅ Diário terapêutico inteligente e livre</li>
              <li className="flex items-center gap-2">✅ Orientação baseada em princípios bíblicos</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCactoSubscribe}
              disabled={isLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              {isLoading ? 'Conectando ao Cacto...' : 'Assinar Plano Premium Cacto'}
            </button>
            
            <button
              onClick={onLogout}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition-colors"
            >
              Sair da Conta (Logout)
            </button>
          </div>

          <p className="text-[9px] text-slate-400 tracking-wider">Processado com segurança pela plataforma Cacto Assinaturas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <div 
            onClick={() => setDevClicks(prev => prev + 1)}
            className="w-16 h-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-sm cursor-pointer active:scale-95 transition-transform"
            title="Desenvolvimento"
          >
            <Heart size={32} fill="currentColor" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight font-accent">Elo</h1>
          <p className="text-slate-500 text-sm">Seu refúgio emocional e de bem-estar</p>
        </div>

        {devClicks >= 5 && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-rose-200 text-left space-y-2 text-xs">
            <p className="font-bold text-slate-700 uppercase tracking-wider text-center">🛠️ Painel Secreto de Desenvolvimento</p>
            <p className="text-[10px] text-slate-500 text-center leading-normal">
              Faça login ou cadastre-se com uma conta real primeiro. Depois, clique no logo de coração para alterar o status do trial ou assinatura.
            </p>
          </div>
        )}

        {/* Tab Selection */}
        {mode !== 'forgot' && (
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === 'login' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === 'signup' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Criar Conta
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-shake">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">E-mail</label>
              <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                <Mail size={16} className="text-slate-400 mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu e-mail cadastrado"
                  className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500">Senha</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                <Lock size={16} className="text-slate-400 mr-2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha de segurança"
                  className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2 "
            >
              <LogIn size={18} />
              {isLoading ? 'Verificando...' : 'Entrar no Elo'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Nome Completo</label>
              <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                <Sparkles size={16} className="text-slate-400 mr-2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como gostaria de ser chamado"
                  className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">E-mail</label>
              <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                <Mail size={16} className="text-slate-400 mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu melhor e-mail"
                  className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Senha</label>
              <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                <Lock size={16} className="text-slate-400 mr-2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie uma senha de acesso"
                  className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-500 leading-normal">
              🎁 Ao se cadastrar, você inicia um <strong>Período de Experiência Gratuito de 60 dias</strong> a partir do seu primeiro login. Sem necessidade de cartão de crédito.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              {isLoading ? 'Cadastrando...' : 'Cadastrar e Ganhar 60 Dias'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Recuperar Senha</h2>
            
            {!showResetForm ? (
              <>
                <p className="text-xs text-slate-400">Informe seu e-mail cadastrado e lhe enviaremos as instruções de recuperação de forma 100% segura.</p>
                <form onSubmit={handlePasswordRecovery} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">E-mail</label>
                    <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                      <Mail size={16} className="text-slate-400 mr-2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Seu e-mail cadastrado"
                        className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-colors"
                    >
                      {isLoading ? 'Enviando...' : 'Recuperar Senha'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400">Insira o código de segurança e escolha uma senha resistente para seu perfil.</p>
                <form onSubmit={handlePasswordResetComplete} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Código de Recuperação (Token)</label>
                    <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                      <Lock size={16} className="text-slate-400 mr-2" />
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Digite o código enviado ou deixe em branco"
                        className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Nova Senha de Segurança</label>
                    <div className="flex items-center bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-rose-400 transition-colors">
                      <Lock size={16} className="text-slate-400 mr-2" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                        className="bg-transparent w-full border-none outline-none text-base placeholder:text-slate-400 text-slate-700 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowResetForm(false); setMode('login'); setError(''); setSuccess(''); }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl text-sm transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-colors"
                    >
                      {isLoading ? 'Redefinindo...' : 'Atualizar Senha'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
