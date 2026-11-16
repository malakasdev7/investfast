-- InvestFast Incremental Evolution Migration
-- Adds tables for Investment Simulations, AI Assistant Conversations/Messages,
-- and "Posso comprar?" Purchase Evaluations, all protected by Row Level Security (RLS)
-- and integrated with the existing audit_logs infrastructure.

-- 1. Simulações salvas da Calculadora de Investimentos
create table if not exists public.investment_simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  calculator_type text not null check (
    calculator_type in (
      'compound_interest',
      'monthly_contributions',
      'financial_goal',
      'financial_independence',
      'real_return',
      'investment_comparator',
      'portfolio_rebalance',
      'debt_payoff',
      'stocks_fiis',
      'fixed_income',
      'crypto'
    )
  ),
  inputs jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  notes text check (length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_investment_simulations_user_created
  on public.investment_simulations(user_id, created_at desc);

alter table public.investment_simulations enable row level security;

drop policy if exists investment_simulations_owner on public.investment_simulations;
create policy investment_simulations_owner on public.investment_simulations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 2. Conversas do Assistente Financeiro de IA
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa' check (length(btrim(title)) between 1 and 140),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_conversations_user_updated
  on public.ai_conversations(user_id, updated_at desc);

alter table public.ai_conversations enable row level security;

drop policy if exists ai_conversations_owner on public.ai_conversations;
create policy ai_conversations_owner on public.ai_conversations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3. Mensagens do Assistente Financeiro de IA
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null check (length(content) <= 16000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_messages_conversation_created
  on public.ai_messages(conversation_id, created_at asc);
create index if not exists idx_ai_messages_user_created
  on public.ai_messages(user_id, created_at desc);

alter table public.ai_messages enable row level security;

drop policy if exists ai_messages_owner on public.ai_messages;
create policy ai_messages_owner on public.ai_messages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 4. Avaliações da funcionalidade "Posso comprar?"
create table if not exists public.purchase_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_ticker text not null check (length(btrim(asset_ticker)) between 1 and 24),
  asset_name text not null check (length(btrim(asset_name)) between 1 and 120),
  asset_class text not null check (
    asset_class in (
      'cdi','stock','fii','etf','bdr','treasury','cdb','lci','lca','cri','cra','debenture','fund','crypto','pension','other'
    )
  ),
  amount numeric(20,8) not null check (amount > 0 and amount <= 999999999999),
  horizon text not null check (horizon in ('short', 'medium', 'long')),
  risk_profile text not null check (risk_profile in ('conservative', 'moderate', 'aggressive')),
  verdict text not null check (
    verdict in ('Pode considerar', 'Atenção', 'Não recomendado agora', 'Preciso de mais informações')
  ),
  score integer not null check (score between 0 and 100),
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_purchase_evaluations_user_created
  on public.purchase_evaluations(user_id, created_at desc);

alter table public.purchase_evaluations enable row level security;

drop policy if exists purchase_evaluations_owner on public.purchase_evaluations;
create policy purchase_evaluations_owner on public.purchase_evaluations
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 5. Função SECURITY DEFINER para registrar eventos sensíveis em audit_logs
create or replace function public.log_security_event(
  p_entity text,
  p_action text,
  p_record_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória';
  end if;

  insert into public.audit_logs(user_id, entity, record_id, action, changes)
  values (
    v_uid,
    left(coalesce(p_entity, 'security'), 60),
    p_record_id,
    left(coalesce(p_action, 'EVENT'), 40),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_security_event(text, text, uuid, jsonb) from public;
grant execute on function public.log_security_event(text, text, uuid, jsonb) to authenticated;

-- 6. Triggers de updated_at e auditoria nas tabelas novas
do $$
declare
  t text;
begin
  foreach t in array array['investment_simulations', 'ai_conversations'] loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function private.touch_updated_at()', t, t);
  end loop;

  foreach t in array array['investment_simulations', 'ai_conversations', 'purchase_evaluations'] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function private.audit()', t, t);
  end loop;
end $$;

