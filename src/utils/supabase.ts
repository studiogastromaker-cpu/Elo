import { createClient } from '@supabase/supabase-js';

// Environment variables configuration
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase keys exist and are not placeholder strings
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim() !== '' &&
    supabaseUrl !== 'MY_SUPABASE_URL' &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim() !== '' &&
    supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY'
  );
};

// Initialize Supabase Client lazily and safely
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

// ==========================================
// DB Relational Schema Typed Interfaces
// ==========================================
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  plano: string; // 'gratuito' | 'premium'
  status_assinatura: string; // 'active' | 'inactive' | 'trial'
  trial_expires_at: string;
  subscription_id: string | null;
  is_premium: boolean;
  created_at: string;
  plan?: string;
  subscription_status?: string;
  trial_started_at?: string;
  premium_until?: string | null;
  payment_provider?: string;
}

export interface LocalAccessLog {
  id: string;
  user_id: string;
  email: string;
  event: string;
  details: string;
  created_at: string;
}

// Global Auth event listeners type
type AuthStateCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'SESSION_REFRESHED' | 'INITIAL_SESSION', session: any) => void;
const authListeners = new Set<AuthStateCallback>();

// Safe JSON Helper
const safeParse = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.warn(`Error parsing key "${key}":`, error);
    return defaultValue;
  }
};

// Trigger all local auth listeners helper
const triggerAuthEvent = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'SESSION_REFRESHED' | 'INITIAL_SESSION', session: any) => {
  authListeners.forEach((callback) => {
    try {
      callback(event, session);
    } catch (e) {
      console.error("Error triggering auth listener event:", e);
    }
  });
};

// Log accesses in a local telemetry structure
const logLocalAccessEvent = (email: string, event: string, details: string) => {
  const currentLogs = safeParse<LocalAccessLog[]>('elo_access_logs', []);
  const newLog: LocalAccessLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    user_id: email, // use email as ID for local sync
    email,
    event,
    details,
    created_at: new Date().toISOString()
  };
  currentLogs.push(newLog);
  localStorage.setItem('elo_access_logs', JSON.stringify(currentLogs));
  console.log(`[ACCESS MONITORING] Event: ${event} | User: ${email} | Safe Log Saved.`);
};

// ==========================================
// UNIFIED AUTHENTICATION SERVICE
// ==========================================
export const authService = {
  // Add auth state listener
  onAuthStateChange(callback: AuthStateCallback) {
    authListeners.add(callback);

    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Fetch or complete user profile
          const profile = await dbService.getProfile(session.user.id, session.user.email || '');
          callback('SIGNED_IN', { user: { ...session.user, profile } });
        } else if (event === 'SIGNED_OUT') {
          callback('SIGNED_OUT', null);
        } else if (event === 'PASSWORD_RECOVERY') {
          callback('PASSWORD_RECOVERY', session);
        } else {
          callback('INITIAL_SESSION', session);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    } else {
      // In local mode, immediately notify current session
      const stored = localStorage.getItem('elo_current_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTimeout(() => {
            callback('INITIAL_SESSION', { user: parsed });
          }, 0);
        } catch {
          callback('SIGNED_OUT', null);
        }
      } else {
        setTimeout(() => {
          callback('SIGNED_OUT', null);
        }, 0);
      }
      return () => {
        authListeners.delete(callback);
      };
    }
  },

  // Log in using Email & Password
  async signIn(emailInput: string, passwordInput: string): Promise<{ session: any; error: any }> {
    const email = emailInput.toLowerCase().trim();
    const password = passwordInput.trim();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          logLocalAccessEvent(email, 'LOGIN_FAILED', error.message);
          return { session: null, error: error.message };
        }
        if (data?.session?.user) {
          const profile = await dbService.getProfile(data.session.user.id, email);
          const fullUser = {
            id: data.session.user.id,
            email: data.session.user.email || email,
            firstLoginAt: profile.created_at,
            trialExpiresAt: profile.trial_expires_at,
            isPremiumSubscriber: profile.is_premium,
            plano: profile.plano,
            status_assinatura: profile.status_assinatura,
            subscription_id: profile.subscription_id
          };
          logLocalAccessEvent(email, 'LOGIN_SUCCESS', 'Supabase Auth successful connection');
          triggerAuthEvent('SIGNED_IN', { user: fullUser });
          return { session: { user: fullUser }, error: null };
        }
        return { session: null, error: 'Erro inesperado na autenticação.' };
      } catch (err: any) {
        logLocalAccessEvent(email, 'LOGIN_CRITICAL_ERR', err?.message || 'Supabase Server connection failed');
        return { session: null, error: err?.message || 'Falha de conexão com o servidor de autenticação.' };
      }
    } else {
      // Browser-based secure database fallback
      const users = safeParse<any[]>('elo_users_db', []);
      const user = users.find(u => u.email.toLowerCase().trim() === email);

      if (!user) {
        logLocalAccessEvent(email, 'LOGIN_FAILED', 'Account e-mail not found in local records');
        return { session: null, error: 'E-mail ou senha inválidos.' };
      }

      if (user.passwordHash !== password) {
        logLocalAccessEvent(email, 'LOGIN_FAILED', 'Incorrect password attempt');
        return { session: null, error: 'E-mail ou senha inválidos.' };
      }

      // Complete first login details
      let updatedUser = { ...user };
      const now = new Date();
      if (!updatedUser.firstLoginAt) {
        updatedUser.firstLoginAt = now.toISOString();
        const trialExpiry = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days standard trial
        updatedUser.trialExpiresAt = trialExpiry.toISOString();
        
        const idx = users.findIndex(u => u.email === email);
        if (idx !== -1) {
          users[idx] = updatedUser;
          localStorage.setItem('elo_users_db', JSON.stringify(users));
        }
      }

      const activeSession = {
        id: updatedUser.id || `user_${email}`,
        email: updatedUser.email,
        firstLoginAt: updatedUser.firstLoginAt,
        trialExpiresAt: updatedUser.trialExpiresAt,
        isPremiumSubscriber: updatedUser.isPremiumSubscriber || false,
        plano: updatedUser.plano || 'gratuito',
        status_assinatura: updatedUser.status_assinatura || 'trial',
        subscription_id: updatedUser.subscription_id || null,
        name: updatedUser.name || 'Usuário Elo'
      };

      localStorage.setItem('elo_current_session', JSON.stringify(activeSession));
      logLocalAccessEvent(email, 'LOGIN_SUCCESS', 'Local database Auth successful connection');
      triggerAuthEvent('SIGNED_IN', { user: activeSession });
      return { session: { user: activeSession }, error: null };
    }
  },

  // Create real or virtual User Accounts
  async signUp(emailInput: string, passwordInput: string, name: string): Promise<{ session: any; error: any }> {
    const email = emailInput.toLowerCase().trim();
    const password = passwordInput.trim();

    if (!email || !password || !name) {
      return { session: null, error: 'Preencha todos os campos obrigatórios.' };
    }

    if (password.length < 6) {
      return { session: null, error: 'A senha precisa ter pelo menos 6 caracteres de segurança.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });

        if (error) {
          logLocalAccessEvent(email, 'REGISTRATION_FAILED', error.message);
          return { session: null, error: error.message };
        }

        if (data?.user) {
          // Initialize their relational public entry entry synchronously
          const profile = await dbService.createProfile(data.user.id, email, name);
          logLocalAccessEvent(email, 'ACCOUNT_CREATED', `Database profile created for ${name}`);
          
          const fullUser = {
            id: data.user.id,
            email: data.user.email || email,
            firstLoginAt: profile.created_at,
            trialExpiresAt: profile.trial_expires_at,
            isPremiumSubscriber: profile.is_premium,
            plano: profile.plano,
            status_assinatura: profile.status_assinatura,
            subscription_id: profile.subscription_id,
            name: name
          };

          return { session: { user: fullUser }, error: null };
        }
        return { session: null, error: 'Ocorreu um erro ao criar a conta.' };
      } catch (err: any) {
        logLocalAccessEvent(email, 'REGISTRATION_CRITICAL_ERR', err?.message || 'Supabase Server connection failed');
        return { session: null, error: err?.message || 'Falha de conexão com o servidor de cadastros.' };
      }
    } else {
      // Local Database simulation for local test integrity
      const users = safeParse<any[]>('elo_users_db', []);
      const exists = users.some(u => u.email === email);

      if (exists) {
        logLocalAccessEvent(email, 'REGISTRATION_FAILED', 'Email already registered in local database');
        return { session: null, error: 'Este e-mail já está cadastrado em nosso sistema.' };
      }

      const now = new Date();
      const trialExpiry = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days trial

      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        email,
        name,
        passwordHash: password,
        firstLoginAt: now.toISOString(),
        trialExpiresAt: trialExpiry.toISOString(),
        isPremiumSubscriber: false,
        plano: 'gratuito',
        status_assinatura: 'trial',
        subscription_id: null,
        created_at: now.toISOString()
      };

      users.push(newUser);
      localStorage.setItem('elo_users_db', JSON.stringify(users));
      logLocalAccessEvent(email, 'ACCOUNT_CREATED', `Local User Profile created for ${name}`);

      const session = {
        id: newUser.id,
        email: newUser.email,
        firstLoginAt: newUser.firstLoginAt,
        trialExpiresAt: newUser.trialExpiresAt,
        isPremiumSubscriber: newUser.isPremiumSubscriber,
        plano: newUser.plano,
        status_assinatura: newUser.status_assinatura,
        subscription_id: newUser.subscription_id,
        name: newUser.name
      };

      localStorage.setItem('elo_current_session', JSON.stringify(session));
      triggerAuthEvent('SIGNED_IN', { user: session });
      return { session, error: null };
    }
  },

  // Log Out securely
  async signOut(email?: string): Promise<{ error: any }> {
    const userEmail = email || safeParse<any>('elo_current_session', null)?.email || 'anon';
    logLocalAccessEvent(userEmail, 'LOGOUT', 'User requested log out session completed');

    localStorage.removeItem('elo_current_session');
    
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signOut();
        triggerAuthEvent('SIGNED_OUT', null);
        return { error };
      } catch (err: any) {
        triggerAuthEvent('SIGNED_OUT', null);
        return { error: err };
      }
    } else {
      triggerAuthEvent('SIGNED_OUT', null);
      return { error: null };
    }
  },

  // Request Security Password Recovery
  async requestPasswordRecovery(emailInput: string): Promise<{ success: boolean; message: string }> {
    const email = emailInput.toLowerCase().trim();
    if (!email) {
      return { success: false, message: 'Digite um email válido.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        // Build absolute redirection links for password recovery based on current window location
        const redirectUrl = `${window.location.origin}/?recovery=true`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });

        if (error) {
          logLocalAccessEvent(email, 'RECOVERY_REQUEST_FAILED', error.message);
          return { success: false, message: error.message };
        }

        logLocalAccessEvent(email, 'RECOVERY_REQUESTED', 'Supabase reset password request sent with absolute callback links');
        return { success: true, message: `Um link de redefinição seguro foi enviado para ${email}.` };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Falha ao solicitar redefinição.' };
      }
    } else {
      // Local Database Auth flow
      const users = safeParse<any[]>('elo_users_db', []);
      const user = users.find(u => u.email === email);

      if (!user) {
        logLocalAccessEvent(email, 'RECOVERY_REQUEST_FAILED', 'Account details not found');
        return { success: false, message: 'Não encontramos nenhuma conta com o e-mail informado.' };
      }

      // Generate a recovery session token
      const token = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      localStorage.setItem('elo_recovery_token', JSON.stringify({ email, token, expiresAt: Date.now() + 15 * 60 * 1000 })); // 15 mins expiry
      
      logLocalAccessEvent(email, 'RECOVERY_REQUESTED', 'Simulated password reset email sent successfully.');
      console.log(`[SIMULATED EMAIL] Link para redefinir senha do Elo: ${window.location.origin}/?token=${token}&email=${email}`);
      
      return { 
        success: true, 
        message: `[Fallback] E-mail de redefinição enviado! Para simular no ambiente de desenvolvimento, utilize este token no campo de nova senha: ${token}` 
      };
    }
  },

  // Complete Password Redefinition Update
  async updatePassword(password: string, tokenOptional?: string): Promise<{ success: boolean; message: string }> {
    if (!password || password.length < 6) {
      return { success: false, message: 'A nova senha precisa conter no mínimo 6 caracteres.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          return { success: false, message: error.message };
        }
        return { success: true, message: 'Sua senha de segurança foi redefinida com sucesso!' };
      } catch (err: any) {
        return { success: false, message: err?.message || 'Não foi possível redefinir sua senha.' };
      }
    } else {
      // Local flow check with stored token or directly inside simulation flow
      try {
        const storedRecovery = safeParse<any>('elo_recovery_token', null);
        let targetEmail = storedRecovery?.email;

        // If the developer passes a specific token in fallback
        if (tokenOptional && storedRecovery && storedRecovery.token !== tokenOptional) {
          return { success: false, message: 'Token de segurança incorreto ou expirado.' };
        }

        if (!targetEmail) {
          // If no recovery session is active, fallback on current logged in user
          const activeSess = safeParse<any>('elo_current_session', null);
          if (activeSess) {
            targetEmail = activeSess.email;
          } else {
            return { success: false, message: 'Sessão de redefinição inválida. Solicite novamente.' };
          }
        }

        const users = safeParse<any[]>('elo_users_db', []);
        const idx = users.findIndex(u => u.email === targetEmail);

        if (idx === -1) {
          return { success: false, message: 'Conta de e-mail não encontrada no banco.' };
        }

        users[idx].passwordHash = password;
        localStorage.setItem('elo_users_db', JSON.stringify(users));
        localStorage.removeItem('elo_recovery_token');

        logLocalAccessEvent(targetEmail, 'PASSWORD_RESET_SUCCESS', 'Password updated successfully in local database.');
        return { success: true, message: 'Sua senha de segurança foi redefinida com sucesso.' };
      } catch (err: any) {
        return { success: false, message: 'Falha crítica ao redefinir senha local.' };
      }
    }
  }
};

// ==========================================
// UNIFIED DATA STORAGE SERVICE
// ==========================================
export const dbService = {
  // Retrieve or create premium profile settings in public records schema
  async getProfile(userId: string, email: string): Promise<UserProfile> {
    const profileKey = `elo_profile_${userId}`;
    const nowStr = new Date().toISOString();
    const fallbackProfile: UserProfile = {
      id: userId,
      email,
      name: 'Membro Elo',
      plano: 'gratuito',
      status_assinatura: 'trial',
      trial_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      subscription_id: null,
      is_premium: false,
      created_at: nowStr,
      plan: 'gratuito',
      subscription_status: 'trial',
      trial_started_at: nowStr,
      premium_until: null,
      payment_provider: 'none'
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error || !data) {
          // If table entry missing, insert one
          return await this.createProfile(userId, email, 'Membro Elo');
        }
        return {
          ...data,
          plan: data.plan || data.plano || 'gratuito',
          subscription_status: data.subscription_status || data.status_assinatura || 'trial',
          trial_started_at: data.trial_started_at || data.created_at,
          premium_until: data.premium_until || null,
          payment_provider: data.payment_provider || 'none'
        } as UserProfile;
      } catch {
        return safeParse<UserProfile>(profileKey, fallbackProfile);
      }
    } else {
      // Local sync based on default users records
      const users = safeParse<any[]>('elo_users_db', []);
      const user = users.find(u => u.email === email);
      if (user) {
        return {
          id: user.id || userId,
          email: user.email,
          name: user.name || 'Membro Elo',
          plano: user.plano || 'gratuito',
          status_assinatura: user.status_assinatura || 'trial',
          trial_expires_at: user.trial_expires_at || fallbackProfile.trial_expires_at,
          subscription_id: user.subscription_id || null,
          is_premium: user.isPremiumSubscriber || false,
          created_at: user.firstLoginAt || fallbackProfile.created_at,
          plan: user.plan || user.plano || 'gratuito',
          subscription_status: user.subscription_status || user.status_assinatura || 'trial',
          trial_started_at: user.trial_started_at || user.firstLoginAt || fallbackProfile.created_at,
          premium_until: user.premium_until || null,
          payment_provider: user.payment_provider || 'none'
        };
      }
      return safeParse<UserProfile>(profileKey, fallbackProfile);
    }
  },

  async createProfile(userId: string, email: string, name: string): Promise<UserProfile> {
    const nowStr = new Date().toISOString();
    const trialExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const defaultProfile: UserProfile = {
      id: userId,
      email,
      name,
      plano: 'gratuito',
      status_assinatura: 'trial',
      trial_expires_at: trialExpiry,
      subscription_id: null,
      is_premium: false,
      created_at: nowStr,
      plan: 'gratuito',
      subscription_status: 'trial',
      trial_started_at: nowStr,
      premium_until: null,
      payment_provider: 'none'
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();

        if (!error && data) {
          return data as UserProfile;
        }
      } catch (e) {
        console.error("Critical Profile Upsert Err:", e);
      }
    }

    localStorage.setItem(`elo_profile_${userId}`, JSON.stringify(defaultProfile));
    return defaultProfile;
  },

  // Subscription state updating
  async updateSubscription(
    userId: string, 
    isPremium: boolean, 
    status: string, 
    plano: string, 
    expiresAt: string,
    subscriptionId: string | null = null,
    paymentProvider: string = 'none',
    premiumUntil: string | null = null,
    trialStartedAt?: string
  ): Promise<boolean> {
    const patchData: any = {
      is_premium: isPremium,
      status_assinatura: status,
      plano: plano,
      trial_expires_at: expiresAt,
      subscription_id: subscriptionId,
      plan: plano,
      subscription_status: status,
      payment_provider: paymentProvider,
      premium_until: premiumUntil
    };
    if (trialStartedAt) {
      patchData.trial_started_at = trialStartedAt;
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update(patchData)
          .eq('id', userId);
        if (!error) return true;
      } catch (e) {
        console.error("Supabase subscription update fail:", e);
      }
    }

    // Always keep Local synced as single source of truth for seamless offline performance
    const active = safeParse<any>('elo_current_session', null);
    if (active && (active.id === userId || active.email === userId)) {
      const updated = {
        ...active,
        isPremiumSubscriber: isPremium,
        status_assinatura: status,
        plano,
        trial_expires_at: expiresAt,
        subscription_id: subscriptionId,
        plan: plano,
        subscription_status: status,
        payment_provider: paymentProvider,
        premium_until: premiumUntil,
        trial_started_at: trialStartedAt || active.trial_started_at
      };
      localStorage.setItem('elo_current_session', JSON.stringify(updated));
    }

    const users = safeParse<any[]>('elo_users_db', []);
    const idx = users.findIndex(u => u.id === userId || u.email === userId);
    if (idx !== -1) {
      users[idx].isPremiumSubscriber = isPremium;
      users[idx].status_assinatura = status;
      users[idx].plano = plano;
      users[idx].trial_expires_at = expiresAt;
      users[idx].subscription_id = subscriptionId;
      users[idx].plan = plano;
      users[idx].subscription_status = status;
      users[idx].payment_provider = paymentProvider;
      users[idx].premium_until = premiumUntil;
      if (trialStartedAt) {
        users[idx].trial_started_at = trialStartedAt;
      }
      localStorage.setItem('elo_users_db', JSON.stringify(users));
      return true;
    }
    return false;
  },

  // TELEMETRY MONITORING FOR SECURITY AUDIT LOGGER
  async queryAccessLogs(): Promise<LocalAccessLog[]> {
    return safeParse<LocalAccessLog[]>('elo_access_logs', []);
  }
};
