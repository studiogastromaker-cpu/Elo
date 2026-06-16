export type ViewMode = 'chat' | 'breathing' | 'diary' | 'about' | 'diagnostic' | 'library' | 'routine';

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type DiagnosticArea = 
  | 'emocional'
  | 'espiritual'
  | 'relacionamentos'
  | 'saude'
  | 'financeiro'
  | 'proposito'
  | 'produtividade'
  | 'habitos'
  | 'mentalidade'
  | 'equilibrio'
  | 'familia';

export interface DiagnosticResult {
  id: string;
  timestamp: string;
  scores: { [key in DiagnosticArea]: number };
  strengths: string[];
  weaknesses: string[];
  guidance: string;
}

export interface DiagnosticQuestion {
  area: DiagnosticArea;
  title: string;
  question: string;
  lowLabel: string;
  highLabel: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  feeling: string;
  content: string;
  gratitude: string;
}

export enum BreathingState {
  INHALING = 'Inspire...',
  HOLDING_IN = 'Segure...',
  EXHALING = 'Expire...',
  HOLDING_OUT = 'Aguarde...'
}

export interface UserSession {
  email: string;
  firstLoginAt: string;
  trialExpiresAt: string;
  isPremiumSubscriber: boolean;
  plano?: string;
  status_assinatura?: string;
  subscription_id?: string | null;
  id?: string;
  plan?: string;
  subscription_status?: string;
  trial_started_at?: string;
  trial_expires_at?: string;
  premium_until?: string | null;
  payment_provider?: string;
}
