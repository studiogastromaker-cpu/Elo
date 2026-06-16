import { UserSession } from '../types';
import { dbService } from './supabase';

// ==========================================
// 1. CHANNELS, PLANS & CONFIGURABLE LIMITS
// ==========================================
export type PlanType = 'free' | 'trial' | 'premium' | 'enterprise';

export interface PlanDefinition {
  type: PlanType;
  name: string;
  maxChatsPerDay: number;
  hasAccessToDiary: boolean;
  hasAccessToRoutines: boolean;
  hasAccessToDiagnostic: boolean;
  hasAccessToLibrary: boolean;
  hasExclusiveInsights: boolean;
  isPremium: boolean;
}

export const PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
  free: {
    type: 'free',
    name: 'Plano Gratuito',
    maxChatsPerDay: 5,
    hasAccessToDiary: true,
    hasAccessToRoutines: false,
    hasAccessToDiagnostic: false,
    hasAccessToLibrary: false,
    hasExclusiveInsights: false,
    isPremium: false,
  },
  trial: {
    type: 'trial',
    name: 'Período de Teste (Trial)',
    maxChatsPerDay: 9999, // Uncapped for trial users
    hasAccessToDiary: true,
    hasAccessToRoutines: true,
    hasAccessToDiagnostic: true,
    hasAccessToLibrary: true,
    hasExclusiveInsights: true,
    isPremium: false,
  },
  premium: {
    type: 'premium',
    name: 'Membro Premium Elo',
    maxChatsPerDay: 9999, // Unlimited
    hasAccessToDiary: true,
    hasAccessToRoutines: true,
    hasAccessToDiagnostic: true,
    hasAccessToLibrary: true,
    hasExclusiveInsights: true,
    isPremium: true,
  },
  enterprise: {
    type: 'enterprise',
    name: 'Corporativo / Business',
    maxChatsPerDay: 9999,
    hasAccessToDiary: true,
    hasAccessToRoutines: true,
    hasAccessToDiagnostic: true,
    hasAccessToLibrary: true,
    hasExclusiveInsights: true,
    isPremium: true,
  },
};

// ==========================================
// 2. USER PAYMENTS AND INTEGRATIONS
// ==========================================
export interface BillingDetails {
  subscriptionId: string | null;
  paymentProvider: 'cacto' | 'stripe' | 'manual' | 'none';
  subscriptionStatus: 'active' | 'inactive' | 'trial' | 'expired' | 'canceled';
  premiumUntil: string | null;
  trialStartedAt: string;
  trialExpiresAt: string;
}

// Unified Permissions Response Object
export interface AuthorizedPermissions {
  planType: PlanType;
  planName: string;
  canUseChat: boolean;
  chatsRemainingToday: number;
  canUseDiary: boolean;
  canUseRoutines: boolean;
  canUseDiagnostic: boolean;
  canUseLibrary: boolean;
  canUseExclusiveInsights: boolean;
  isTrialExpired: boolean;
  trialDaysLeft: number;
  isPremium: boolean;
  status: string;
}

// ==========================================
// 3. CENTRALIZED SUBSCRIPTION SERVICE
// ==========================================
export const SubscriptionService = {
  /**
   * Safe check for active trial
   */
  isTrialActive(session: UserSession | null): boolean {
    if (!session) return false;
    const expiresAt = new Date(session.trialExpiresAt);
    return expiresAt.getTime() > Date.now();
  },

  /**
   * Determine exact active plan type
   */
  resolvePlanType(session: UserSession | null): PlanType {
    if (!session) return 'free';
    if (session.isPremiumSubscriber || session.plano === 'premium') return 'premium';
    if (session.plano === 'enterprise') return 'enterprise';
    
    // Check if trial has expired
    const isExpired = new Date(session.trialExpiresAt).getTime() < Date.now();
    if (isExpired) return 'free'; // fallback to standard free limits
    
    return 'trial';
  },

  /**
   * Resolve and get complete Authorized Permissions layout securely
   */
  getPermissions(session: UserSession | null): AuthorizedPermissions {
    const planType = this.resolvePlanType(session);
    const config = PLAN_DEFINITIONS[planType];

    let trialDaysLeft = 0;
    let isTrialExpired = true;

    if (session?.trialExpiresAt) {
      const diffTime = new Date(session.trialExpiresAt).getTime() - Date.now();
      trialDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isTrialExpired = diffTime <= 0;
    }

    // Daily active chat tracker limit check
    const currentChats = this.getChatsUsedToday(session?.email || 'guest');
    const chatsRemaining = Math.max(0, config.maxChatsPerDay - currentChats);

    return {
      planType,
      planName: config.name,
      canUseChat: config.maxChatsPerDay > 0 && (chatsRemaining > 0 || config.maxChatsPerDay > 100),
      chatsRemainingToday: chatsRemaining,
      canUseDiary: config.hasAccessToDiary,
      canUseRoutines: config.hasAccessToRoutines,
      canUseDiagnostic: config.hasAccessToDiagnostic,
      canUseLibrary: config.hasAccessToLibrary,
      canUseExclusiveInsights: config.hasExclusiveInsights,
      isTrialExpired,
      trialDaysLeft: Math.max(0, trialDaysLeft),
      isPremium: config.isPremium,
      status: session?.status_assinatura || (isTrialExpired ? 'expired' : 'trial')
    };
  },

  /**
   * Check if a specific view fits authorization
   */
  canAccessView(view: string, session: UserSession | null): boolean {
    if (view === 'about' || view === 'breathing') return true;
    const perms = this.getPermissions(session);

    switch (view) {
      case 'chat':
        return perms.planType === 'premium' || perms.planType === 'trial' || perms.planType === 'free';
      case 'diary':
        return perms.canUseDiary;
      case 'routine':
        return perms.canUseRoutines;
      case 'diagnostic':
        return perms.canUseDiagnostic;
      case 'library':
        return perms.canUseLibrary;
      default:
        return false;
    }
  },

  /**
   * Track daily limits cleanly via local audit tracking
   */
  getChatsUsedToday(email: string): number {
    try {
      const trackerKey = `elo_chat_tracker_${email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const stored = localStorage.getItem(trackerKey);
      
      if (stored) {
        const { date, count } = JSON.parse(stored);
        if (date === today) return count;
      }
    } catch (e) {
      console.warn("Tracker parsing warning:", e);
    }
    return 0;
  },

  /**
   * Safely log an analytical conversation instance and increment limit trackers
   */
  incrementChatUsage(email: string): void {
    try {
      const trackerKey = `elo_chat_tracker_${email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const stored = localStorage.getItem(trackerKey);
      
      let count = 1;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          count = parsed.count + 1;
        }
      }
      localStorage.setItem(trackerKey, JSON.stringify({ date: today, count }));
    } catch (e) {
      console.warn("Error incrementing daily chat count:", e);
    }
  },

  /**
   * Simulated API check helper to protect resources / mimic backend verification
   */
  verifyBackendAccess(userId: string, email: string): Promise<AuthorizedPermissions> {
    return new Promise(async (resolve) => {
      const profile = await dbService.getProfile(userId, email);
      const sessionMock: UserSession = {
        id: userId,
        email: email,
        firstLoginAt: profile.created_at,
        trialExpiresAt: profile.trial_expires_at,
        isPremiumSubscriber: profile.is_premium,
        plano: profile.plano,
        status_assinatura: profile.status_assinatura,
        subscription_id: profile.subscription_id
      };
      resolve(this.getPermissions(sessionMock));
    });
  }
};
