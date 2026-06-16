-- =========================================================================
-- ELO - SCRIPT DE MIGRAÇÃO E INTEGRAÇÃO SUPABASE (PRODUÇÃO)
-- =========================================================================
-- Execute este arquivo no "SQL Editor" do seu painel do Supabase.
-- Ele é totalmente idempotente (pode ser executado múltiplas vezes com segurança).
-- Garante 100% de compatibilidade offline-first pelo LocalStorage e online via Supabase.
-- =========================================================================

-- 1. Criação da Tabela de Perfis Públicos (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  
  -- Campos legados em português (preserva retrocompatibilidade total com funcionalidades existentes)
  plano TEXT DEFAULT 'gratuito',
  status_assinatura TEXT DEFAULT 'trial',
  trial_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '60 days'),
  subscription_id TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Estruturas profissionais preparadas para monetização real e controle de planos
  plan TEXT DEFAULT 'gratuito',
  subscription_status TEXT DEFAULT 'trial',
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  premium_until TIMESTAMPTZ DEFAULT NULL,
  payment_provider TEXT DEFAULT 'none'
);

-- 2. Garantia de que colunas não nulas tenham valores default apropriados
ALTER TABLE public.profiles ALTER COLUMN plano SET DEFAULT 'gratuito';
ALTER TABLE public.profiles ALTER COLUMN status_assinatura SET DEFAULT 'trial';
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'gratuito';
ALTER TABLE public.profiles ALTER COLUMN subscription_status SET DEFAULT 'trial';
ALTER TABLE public.profiles ALTER COLUMN payment_provider SET DEFAULT 'none';

-- 3. Função e Trigger para Sincronização e Criação Automática do Perfil
-- Quando um usuário se cadastrar no Supabase Auth, o banco cria o perfil público dele automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    plano, 
    status_assinatura, 
    trial_expires_at, 
    plan, 
    subscription_status, 
    trial_started_at,
    payment_provider
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Membro Elo'),
    'gratuito',
    'trial',
    (now() + INTERVAL '60 days'),
    'gratuito',
    'trial',
    now(),
    'none'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove o trigger caso já exista antes de recriá-lo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Migração e Normalização de Dados Legados
-- Sincroniza campos antigos em português com os correspondentes em inglês
UPDATE public.profiles 
SET plan = plano 
WHERE plan IS NULL AND plano IS NOT NULL;

UPDATE public.profiles 
SET subscription_status = status_assinatura 
WHERE subscription_status IS NULL AND status_assinatura IS NOT NULL;

UPDATE public.profiles 
SET trial_started_at = created_at 
WHERE trial_started_at IS NULL;

-- 5. Segurança do Banco e Políticas de Acesso RLS (Row Level Security)
-- Garante que um usuário só terá permissão para ler/escrever os seus próprios dados corporativos ou de saúde
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpa políticas anteriores para evitar duplicações
DROP POLICY IF EXISTS "Usuários podem ler seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

CREATE POLICY "Allow users to read their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 6. Tabela opcional de Auditoria e Logs de Acesso
CREATE TABLE IF NOT EXISTS public.access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.access_logs;
CREATE POLICY "Users can insert their own logs" 
  ON public.access_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can read their own logs" ON public.access_logs;
CREATE POLICY "Users can read their own logs" 
  ON public.access_logs FOR SELECT 
  USING (auth.uid() = user_id);
