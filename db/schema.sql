-- Schema da assinatura LanhouseDigital (rode no SQL editor do Supabase).

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  google_id text,
  asaas_customer_id text,
  uf text,                          -- UF do usuário, para serviços estaduais (IPVA)
  created_at timestamptz default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  plan text,                                -- mensal | anual
  asaas_subscription_id text,               -- usado no plano anual (recorrente)
  asaas_payment_id text,                    -- usado no plano mensal (PIX avulso)
  status text not null default 'pending',   -- pending | active | overdue | canceled
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_user on subscriptions(user_id);
create index if not exists idx_subscriptions_asaas on subscriptions(asaas_subscription_id);
create index if not exists idx_subscriptions_payment on subscriptions(asaas_payment_id);

-- Idempotência do webhook do Asaas (evita processar o mesmo evento duas vezes).
create table if not exists processed_webhooks (
  key text primary key,
  created_at timestamptz default now()
);

-- UF do usuário, para serviços estaduais (ex: IPVA).
-- alter table app_users add column if not exists uf text;

-- Migração (se as tabelas já existiam sem essas colunas):
-- alter table subscriptions add column if not exists plan text;
-- alter table subscriptions add column if not exists asaas_payment_id text;
-- create index if not exists idx_subscriptions_payment on subscriptions(asaas_payment_id);
