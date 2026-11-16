-- Market data is private per user: manual prices never contaminate other accounts.
-- Existing financial tables, triggers and calculations are intentionally untouched.
create table public.market_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ticker text not null check(length(ticker) between 1 and 100),
  name text not null check(length(name) between 1 and 200),
  type text not null check(type in ('acoes','fiis','cripto','indices')),
  asset_class text not null check(asset_class in ('stock','fii','etf','bdr','crypto','index')),
  currency text not null default 'BRL' check(currency in ('BRL','POINTS')),
  provider text not null check(provider in ('brapi','coingecko','manual')),
  provider_id text not null check(length(provider_id) between 1 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id,type,provider_id), unique(user_id,id)
);
create index market_assets_ticker_idx on public.market_assets(ticker);
create index market_assets_user_created_idx on public.market_assets(user_id,created_at);
create table public.market_prices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id uuid not null,
  price numeric(28,12) not null check(price>=0),
  change numeric(28,12), change_percent numeric(20,8),
  change_7d numeric(20,8), change_30d numeric(20,8),
  volume numeric(38,8), high numeric(28,12), low numeric(28,12), market_cap numeric(38,8),
  timestamp timestamptz not null,
  source text not null check(source in ('brapi','coingecko','manual')),
  created_at timestamptz not null default now(),
  foreign key(user_id,asset_id) references public.market_assets(user_id,id) on delete cascade,
  unique(user_id,asset_id,timestamp,source)
);
create index market_prices_asset_time_idx on public.market_prices(asset_id,timestamp desc);
create index market_prices_timestamp_idx on public.market_prices(timestamp desc);
create index market_prices_user_created_idx on public.market_prices(user_id,created_at);
create table public.user_favorite_assets (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(user_id,asset_id),
  foreign key(user_id,asset_id) references public.market_assets(user_id,id) on delete cascade
);
create index user_favorite_assets_asset_idx on public.user_favorite_assets(asset_id);
create index user_favorite_assets_created_idx on public.user_favorite_assets(created_at);
alter table public.market_assets enable row level security;
alter table public.market_prices enable row level security;
alter table public.user_favorite_assets enable row level security;
create policy own_market_assets on public.market_assets for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_market_prices on public.market_prices for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_market_favorites on public.user_favorite_assets for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.market_assets,public.market_prices,public.user_favorite_assets from anon,authenticated;
grant select,insert,update,delete on public.market_assets,public.market_prices,public.user_favorite_assets to authenticated;
