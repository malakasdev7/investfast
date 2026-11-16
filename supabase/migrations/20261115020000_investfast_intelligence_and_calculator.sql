-- Etapa 2: Estrutura de banco de dados para Calculadora, Assistente IA, Análises, Recomendações, Perfil de Risco e Preferências
-- Migração incremental, idempotente e compatível com o schema existente do InvestFast.

begin;

-- ============================================================================
-- 1. investment_calculations
-- ============================================================================
create table if not exists public.investment_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (
    type in (
      'compound_interest',
      'monthly_contributions',
      'financial_goal',
      'fire',
      'real_return',
      'investment_comparison',
      'portfolio_rebalancing',
      'loan_amortization',
      'stocks_fiis',
      'fixed_income',
      'crypto'
    )
  ),
  title text not null check (length(btrim(title)) between 1 and 160),
  asset_id uuid references public.assets(id) on delete set null,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  initial_amount numeric(20, 8) not null default 0 check (initial_amount >= 0),
  monthly_contribution numeric(20, 8) not null default 0,
  interest_rate numeric(12, 6) not null default 0,
  rate_period text not null default 'yearly' check (rate_period in ('monthly', 'yearly')),
  term_value numeric(12, 4) not null default 0 check (term_value >= 0),
  term_unit text not null default 'months' check (term_unit in ('months', 'years')),
  compounding text not null default 'monthly' check (compounding in ('monthly', 'yearly', 'continuous')),
  inflation_rate numeric(12, 6) not null default 0,
  tax_rate numeric(12, 6) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  admin_fee numeric(12, 6) not null default 0 check (admin_fee >= 0 and admin_fee <= 100),
  target_amount numeric(20, 8) check (target_amount is null or target_amount >= 0),
  safe_withdrawal_rate numeric(10, 4) check (safe_withdrawal_rate is null or (safe_withdrawal_rate > 0 and safe_withdrawal_rate <= 100)),
  final_gross_amount numeric(20, 8),
  final_net_amount numeric(20, 8),
  total_invested numeric(20, 8),
  total_interest numeric(20, 8),
  total_return_pct numeric(14, 6),
  annualized_return_pct numeric(14, 6),
  real_return_pct numeric(14, 6),
  inputs jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  notes text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

alter table public.investment_calculations enable row level security;

create index if not exists investment_calculations_user_id_idx
  on public.investment_calculations (user_id);
create index if not exists investment_calculations_created_at_idx
  on public.investment_calculations (created_at desc);
create index if not exists investment_calculations_type_idx
  on public.investment_calculations (type);
create index if not exists investment_calculations_asset_id_idx
  on public.investment_calculations (asset_id)
  where asset_id is not null;
create index if not exists investment_calculations_portfolio_id_idx
  on public.investment_calculations (portfolio_id)
  where portfolio_id is not null;
create index if not exists investment_calculations_user_type_created_idx
  on public.investment_calculations (user_id, type, created_at desc);

drop policy if exists own_select on public.investment_calculations;
drop policy if exists own_insert on public.investment_calculations;
drop policy if exists own_update on public.investment_calculations;
drop policy if exists own_delete on public.investment_calculations;

create policy own_select on public.investment_calculations
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.investment_calculations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_update on public.investment_calculations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy own_delete on public.investment_calculations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.investment_calculations from anon, authenticated;
grant select, insert, update, delete on public.investment_calculations to authenticated;

-- ============================================================================
-- 2. ai_conversations
-- ============================================================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa' check (length(btrim(title)) between 1 and 140),
  type text not null default 'general' check (
    type in ('general', 'portfolio_analysis', 'can_i_buy', 'goal_planning', 'calculator')
  ),
  archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_conversations
  add column if not exists type text not null default 'general';
alter table public.ai_conversations
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.ai_conversations
  add column if not exists last_message_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_conversations_user_id_id_key'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations add constraint ai_conversations_user_id_id_key unique (user_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_conversations_type_check'
      and conrelid = 'public.ai_conversations'::regclass
  ) then
    alter table public.ai_conversations
      add constraint ai_conversations_type_check
      check (type in ('general', 'portfolio_analysis', 'can_i_buy', 'goal_planning', 'calculator'));
  end if;
end $$;

alter table public.ai_conversations enable row level security;

create index if not exists ai_conversations_user_id_idx
  on public.ai_conversations (user_id);
create index if not exists ai_conversations_created_at_idx
  on public.ai_conversations (created_at desc);
create index if not exists ai_conversations_type_idx
  on public.ai_conversations (type);
create index if not exists ai_conversations_user_last_msg_idx
  on public.ai_conversations (user_id, last_message_at desc);

drop policy if exists ai_conversations_owner on public.ai_conversations;
drop policy if exists own_select on public.ai_conversations;
drop policy if exists own_insert on public.ai_conversations;
drop policy if exists own_update on public.ai_conversations;
drop policy if exists own_delete on public.ai_conversations;

create policy own_select on public.ai_conversations
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.ai_conversations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_update on public.ai_conversations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy own_delete on public.ai_conversations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_conversations from anon, authenticated;
grant select, insert, update, delete on public.ai_conversations to authenticated;

-- ============================================================================
-- 3. ai_messages
-- ============================================================================
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  type text not null default 'text' check (
    type in ('text', 'analysis', 'can_i_buy', 'tool_result', 'error')
  ),
  content text not null check (length(content) <= 32000),
  model text,
  token_count integer check (token_count is null or token_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_messages
  add column if not exists type text not null default 'text';
alter table public.ai_messages
  add column if not exists model text;
alter table public.ai_messages
  add column if not exists token_count integer;
alter table public.ai_messages
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_messages_user_id_id_key'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages add constraint ai_messages_user_id_id_key unique (user_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_messages_type_check'
      and conrelid = 'public.ai_messages'::regclass
  ) then
    alter table public.ai_messages
      add constraint ai_messages_type_check
      check (type in ('text', 'analysis', 'can_i_buy', 'tool_result', 'error'));
  end if;
end $$;

alter table public.ai_messages enable row level security;

create index if not exists ai_messages_user_id_idx
  on public.ai_messages (user_id);
create index if not exists ai_messages_conversation_id_idx
  on public.ai_messages (conversation_id);
create index if not exists ai_messages_created_at_idx
  on public.ai_messages (created_at desc);
create index if not exists ai_messages_type_idx
  on public.ai_messages (type);
create index if not exists ai_messages_conversation_created_idx
  on public.ai_messages (conversation_id, created_at asc);

drop policy if exists ai_messages_owner on public.ai_messages;
drop policy if exists own_select on public.ai_messages;
drop policy if exists own_insert on public.ai_messages;
drop policy if exists own_update on public.ai_messages;
drop policy if exists own_delete on public.ai_messages;

create policy own_select on public.ai_messages
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.ai_messages
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy own_update on public.ai_messages
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy own_delete on public.ai_messages
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_messages from anon, authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;

-- ============================================================================
-- 4. ai_tool_calls
-- ============================================================================
create table if not exists public.ai_tool_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  message_id uuid references public.ai_messages(id) on delete cascade,
  tool_name text not null check (length(btrim(tool_name)) between 1 and 120),
  type text not null default 'query' check (type in ('query', 'market', 'calculation', 'analysis')),
  asset_id uuid references public.assets(id) on delete set null,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  arguments jsonb not null default '{}'::jsonb,
  result jsonb,
  status text not null default 'success' check (status in ('pending', 'success', 'error')),
  error_message text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  executed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

alter table public.ai_tool_calls enable row level security;

create index if not exists ai_tool_calls_user_id_idx
  on public.ai_tool_calls (user_id);
create index if not exists ai_tool_calls_conversation_id_idx
  on public.ai_tool_calls (conversation_id);
create index if not exists ai_tool_calls_created_at_idx
  on public.ai_tool_calls (created_at desc);
create index if not exists ai_tool_calls_type_idx
  on public.ai_tool_calls (type);
create index if not exists ai_tool_calls_asset_id_idx
  on public.ai_tool_calls (asset_id)
  where asset_id is not null;
create index if not exists ai_tool_calls_portfolio_id_idx
  on public.ai_tool_calls (portfolio_id)
  where portfolio_id is not null;
create index if not exists ai_tool_calls_message_id_idx
  on public.ai_tool_calls (message_id)
  where message_id is not null;

drop policy if exists own_select on public.ai_tool_calls;
drop policy if exists own_insert on public.ai_tool_calls;
drop policy if exists own_update on public.ai_tool_calls;
drop policy if exists own_delete on public.ai_tool_calls;

create policy own_select on public.ai_tool_calls
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.ai_tool_calls
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy own_update on public.ai_tool_calls
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );
create policy own_delete on public.ai_tool_calls
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_tool_calls from anon, authenticated;
grant select, insert, update, delete on public.ai_tool_calls to authenticated;

-- ============================================================================
-- 5. financial_insights
-- ============================================================================
create table if not exists public.financial_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (
    type in (
      'cashflow_summary',
      'spending_category',
      'month_comparison',
      'savings_rate',
      'investment_capacity',
      'emergency_fund',
      'debt_alert',
      'goal_progress',
      'allocation',
      'concentration',
      'diversification',
      'liquidity',
      'risk_estimate',
      'profitability',
      'dividends',
      'opportunity'
    )
  ),
  severity text not null default 'info' check (severity in ('info', 'positive', 'warning', 'critical')),
  title text not null check (length(btrim(title)) between 1 and 180),
  summary text not null check (length(btrim(summary)) >= 1),
  metric_value numeric(20, 8),
  previous_value numeric(20, 8),
  benchmark_value numeric(20, 8),
  variation_pct numeric(14, 6),
  asset_id uuid references public.assets(id) on delete set null,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  period_start timestamptz,
  period_end timestamptz,
  analyzed_at timestamptz not null default now(),
  expires_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  is_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

alter table public.financial_insights enable row level security;

create index if not exists financial_insights_user_id_idx
  on public.financial_insights (user_id);
create index if not exists financial_insights_created_at_idx
  on public.financial_insights (created_at desc);
create index if not exists financial_insights_type_idx
  on public.financial_insights (type);
create index if not exists financial_insights_asset_id_idx
  on public.financial_insights (asset_id)
  where asset_id is not null;
create index if not exists financial_insights_portfolio_id_idx
  on public.financial_insights (portfolio_id)
  where portfolio_id is not null;
create index if not exists financial_insights_user_type_created_idx
  on public.financial_insights (user_id, type, created_at desc);

drop policy if exists own_select on public.financial_insights;
drop policy if exists own_insert on public.financial_insights;
drop policy if exists own_update on public.financial_insights;
drop policy if exists own_delete on public.financial_insights;

create policy own_select on public.financial_insights
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.financial_insights
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_update on public.financial_insights
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy own_delete on public.financial_insights
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.financial_insights from anon, authenticated;
grant select, insert, update, delete on public.financial_insights to authenticated;

-- ============================================================================
-- 6. recommendations
-- ============================================================================
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  type text not null check (
    type in (
      'portfolio_improvement',
      'rebalancing',
      'emergency_fund',
      'debt_payoff',
      'savings_optimization',
      'diversification',
      'can_i_buy',
      'goal_adjustment'
    )
  ),
  verdict text not null default 'review' check (
    verdict in (
      'approved',
      'caution',
      'not_recommended',
      'prioritize_debt',
      'prioritize_reserve',
      'review',
      'action_required'
    )
  ),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  title text not null check (length(btrim(title)) between 1 and 180),
  rationale text not null check (length(btrim(rationale)) >= 1),
  asset_id uuid references public.assets(id) on delete set null,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  requested_amount numeric(20, 8) check (requested_amount is null or requested_amount >= 0),
  max_recommended_amount numeric(20, 8) check (max_recommended_amount is null or max_recommended_amount >= 0),
  budget_impact_pct numeric(10, 4),
  portfolio_share_before numeric(10, 4),
  portfolio_share_after numeric(10, 4),
  risks jsonb not null default '[]'::jsonb,
  alternatives jsonb not null default '[]'::jsonb,
  follow_up_questions jsonb not null default '[]'::jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'applied', 'dismissed', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

alter table public.recommendations enable row level security;

create index if not exists recommendations_user_id_idx
  on public.recommendations (user_id);
create index if not exists recommendations_created_at_idx
  on public.recommendations (created_at desc);
create index if not exists recommendations_type_idx
  on public.recommendations (type);
create index if not exists recommendations_conversation_id_idx
  on public.recommendations (conversation_id)
  where conversation_id is not null;
create index if not exists recommendations_asset_id_idx
  on public.recommendations (asset_id)
  where asset_id is not null;
create index if not exists recommendations_portfolio_id_idx
  on public.recommendations (portfolio_id)
  where portfolio_id is not null;
create index if not exists recommendations_user_type_created_idx
  on public.recommendations (user_id, type, created_at desc);

drop policy if exists own_select on public.recommendations;
drop policy if exists own_insert on public.recommendations;
drop policy if exists own_update on public.recommendations;
drop policy if exists own_delete on public.recommendations;

create policy own_select on public.recommendations
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.recommendations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_update on public.recommendations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy own_delete on public.recommendations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.recommendations from anon, authenticated;
grant select, insert, update, delete on public.recommendations to authenticated;

-- ============================================================================
-- 7. risk_profiles
-- ============================================================================
create table if not exists public.risk_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null default 'moderate' check (
    type in ('conservative', 'moderate', 'balanced', 'growth', 'aggressive')
  ),
  score numeric(6, 2) not null default 50 check (score >= 0 and score <= 100),
  investment_horizon text not null default 'medium' check (
    investment_horizon in ('short', 'medium', 'long', 'very_long')
  ),
  liquidity_preference text not null default 'medium' check (
    liquidity_preference in ('high', 'medium', 'low')
  ),
  monthly_income numeric(20, 8) not null default 0 check (monthly_income >= 0),
  monthly_expenses numeric(20, 8) not null default 0 check (monthly_expenses >= 0),
  emergency_months_target numeric(6, 2) not null default 6 check (emergency_months_target >= 1 and emergency_months_target <= 36),
  max_single_asset_pct numeric(6, 2) not null default 20 check (max_single_asset_pct > 0 and max_single_asset_pct <= 100),
  has_high_interest_debt boolean not null default false,
  high_interest_debt_balance numeric(20, 8) not null default 0 check (high_interest_debt_balance >= 0),
  monthly_debt_payment numeric(20, 8) not null default 0 check (monthly_debt_payment >= 0),
  answers jsonb not null default '{}'::jsonb,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (user_id, id)
);

alter table public.risk_profiles enable row level security;

create index if not exists risk_profiles_user_id_idx
  on public.risk_profiles (user_id);
create index if not exists risk_profiles_created_at_idx
  on public.risk_profiles (created_at desc);
create index if not exists risk_profiles_type_idx
  on public.risk_profiles (type);

drop policy if exists own_select on public.risk_profiles;
drop policy if exists own_insert on public.risk_profiles;
drop policy if exists own_update on public.risk_profiles;
drop policy if exists own_delete on public.risk_profiles;

create policy own_select on public.risk_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.risk_profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_update on public.risk_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy own_delete on public.risk_profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.risk_profiles from anon, authenticated;
grant select, insert, update, delete on public.risk_profiles to authenticated;

-- ============================================================================
-- 8. user_preferences
-- ============================================================================
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null default 'general' check (
    type in ('general', 'calculator', 'assistant', 'alerts')
  ),
  default_inflation_rate numeric(12, 6) not null default 4.50,
  default_cdi_rate numeric(12, 6) not null default 11.25,
  default_selic_rate numeric(12, 6) not null default 11.25,
  default_swr_rate numeric(10, 4) not null default 4.00 check (default_swr_rate > 0 and default_swr_rate <= 100),
  default_tax_rate numeric(10, 4) not null default 15.00 check (default_tax_rate >= 0 and default_tax_rate <= 100),
  concentration_alert_pct numeric(10, 4) not null default 20.00 check (concentration_alert_pct > 0 and concentration_alert_pct <= 100),
  monthly_investment_target numeric(20, 8) not null default 0 check (monthly_investment_target >= 0),
  ai_response_style text not null default 'balanced' check (ai_response_style in ('concise', 'balanced', 'detailed')),
  include_financial_context boolean not null default true,
  notify_insights boolean not null default true,
  notify_rebalancing boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id),
  unique (user_id, id)
);

alter table public.user_preferences enable row level security;

create index if not exists user_preferences_user_id_idx
  on public.user_preferences (user_id);
create index if not exists user_preferences_created_at_idx
  on public.user_preferences (created_at desc);
create index if not exists user_preferences_type_idx
  on public.user_preferences (type);

drop policy if exists own_select on public.user_preferences;
drop policy if exists own_insert on public.user_preferences;
drop policy if exists own_update on public.user_preferences;
drop policy if exists own_delete on public.user_preferences;

create policy own_select on public.user_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_insert on public.user_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_update on public.user_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy own_delete on public.user_preferences
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.user_preferences from anon, authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;

-- ============================================================================
-- Triggers de integridade, ownership, updated_at e auditoria
-- ============================================================================
create or replace function private.verify_intelligence_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset_id uuid;
  v_portfolio_id uuid;
  v_conversation_id uuid;
  v_message_id uuid;
  v_row jsonb := to_jsonb(new);
begin
  v_asset_id := nullif(v_row->>'asset_id', '')::uuid;
  v_portfolio_id := nullif(v_row->>'portfolio_id', '')::uuid;
  v_conversation_id := nullif(v_row->>'conversation_id', '')::uuid;
  v_message_id := nullif(v_row->>'message_id', '')::uuid;

  if v_asset_id is not null and not exists (
    select 1 from public.assets a
    where a.id = v_asset_id and a.user_id = new.user_id
  ) then
    raise exception 'Ativo não pertence ao usuário autenticado';
  end if;

  if v_portfolio_id is not null and not exists (
    select 1 from public.portfolios p
    where p.id = v_portfolio_id and p.user_id = new.user_id
  ) then
    raise exception 'Carteira não pertence ao usuário autenticado';
  end if;

  if v_conversation_id is not null and not exists (
    select 1 from public.ai_conversations c
    where c.id = v_conversation_id and c.user_id = new.user_id
  ) then
    raise exception 'Conversa não pertence ao usuário autenticado';
  end if;

  if v_message_id is not null and not exists (
    select 1 from public.ai_messages m
    where m.id = v_message_id and m.user_id = new.user_id
  ) then
    raise exception 'Mensagem não pertence ao usuário autenticado';
  end if;

  return new;
end
$$;

revoke all on function private.verify_intelligence_refs() from public, anon, authenticated;

-- Atualiza last_message_at da conversa ao inserir mensagens
create or replace function private.touch_ai_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_conversations
     set last_message_at = greatest(last_message_at, new.created_at),
         updated_at = now()
   where id = new.conversation_id
     and user_id = new.user_id;
  return new;
end
$$;

revoke all on function private.touch_ai_conversation_last_message() from public, anon, authenticated;

-- Remove triggers antigos com nomes inconsistentes, se existirem
drop trigger if exists ai_conversations_touch on public.ai_conversations;

-- investment_calculations
drop trigger if exists touch on public.investment_calculations;
drop trigger if exists a_lock_owner on public.investment_calculations;
drop trigger if exists b_verify_refs on public.investment_calculations;
drop trigger if exists audit on public.investment_calculations;
create trigger touch before update on public.investment_calculations for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.investment_calculations for each row execute function private.lock_owner();
create trigger b_verify_refs before insert or update on public.investment_calculations for each row execute function private.verify_intelligence_refs();
create trigger audit after insert or update or delete on public.investment_calculations for each row execute function private.audit();

-- ai_conversations
drop trigger if exists touch on public.ai_conversations;
drop trigger if exists a_lock_owner on public.ai_conversations;
drop trigger if exists audit on public.ai_conversations;
create trigger touch before update on public.ai_conversations for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.ai_conversations for each row execute function private.lock_owner();
create trigger audit after insert or update or delete on public.ai_conversations for each row execute function private.audit();

-- ai_messages
drop trigger if exists touch on public.ai_messages;
drop trigger if exists a_lock_owner on public.ai_messages;
drop trigger if exists b_verify_refs on public.ai_messages;
drop trigger if exists touch_conversation_last_message on public.ai_messages;
create trigger touch before update on public.ai_messages for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.ai_messages for each row execute function private.lock_owner();
create trigger b_verify_refs before insert or update on public.ai_messages for each row execute function private.verify_intelligence_refs();
create trigger touch_conversation_last_message after insert on public.ai_messages for each row execute function private.touch_ai_conversation_last_message();

-- ai_tool_calls
drop trigger if exists touch on public.ai_tool_calls;
drop trigger if exists a_lock_owner on public.ai_tool_calls;
drop trigger if exists b_verify_refs on public.ai_tool_calls;
create trigger touch before update on public.ai_tool_calls for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.ai_tool_calls for each row execute function private.lock_owner();
create trigger b_verify_refs before insert or update on public.ai_tool_calls for each row execute function private.verify_intelligence_refs();

-- financial_insights
drop trigger if exists touch on public.financial_insights;
drop trigger if exists a_lock_owner on public.financial_insights;
drop trigger if exists b_verify_refs on public.financial_insights;
drop trigger if exists audit on public.financial_insights;
create trigger touch before update on public.financial_insights for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.financial_insights for each row execute function private.lock_owner();
create trigger b_verify_refs before insert or update on public.financial_insights for each row execute function private.verify_intelligence_refs();
create trigger audit after insert or update or delete on public.financial_insights for each row execute function private.audit();

-- recommendations
drop trigger if exists touch on public.recommendations;
drop trigger if exists a_lock_owner on public.recommendations;
drop trigger if exists b_verify_refs on public.recommendations;
drop trigger if exists audit on public.recommendations;
create trigger touch before update on public.recommendations for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.recommendations for each row execute function private.lock_owner();
create trigger b_verify_refs before insert or update on public.recommendations for each row execute function private.verify_intelligence_refs();
create trigger audit after insert or update or delete on public.recommendations for each row execute function private.audit();

-- risk_profiles
drop trigger if exists touch on public.risk_profiles;
drop trigger if exists a_lock_owner on public.risk_profiles;
drop trigger if exists audit on public.risk_profiles;
create trigger touch before update on public.risk_profiles for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.risk_profiles for each row execute function private.lock_owner();
create trigger audit after insert or update or delete on public.risk_profiles for each row execute function private.audit();

-- user_preferences
drop trigger if exists touch on public.user_preferences;
drop trigger if exists a_lock_owner on public.user_preferences;
drop trigger if exists audit on public.user_preferences;
create trigger touch before update on public.user_preferences for each row execute function private.touch();
create trigger a_lock_owner before insert or update or delete on public.user_preferences for each row execute function private.lock_owner();
create trigger audit after insert or update or delete on public.user_preferences for each row execute function private.audit();

commit;
