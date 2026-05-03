create extension if not exists pgcrypto;

create table if not exists public.wealth_profiles (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  name text default 'My Plan',
  monthly_income numeric(12, 2) not null default 0,
  fixed_expenses numeric(12, 2) not null default 0,
  variable_expenses numeric(12, 2) not null default 0,
  debt_balance numeric(12, 2) not null default 0,
  debt_apr numeric(5, 2) not null default 0,
  emergency_current numeric(12, 2) not null default 0,
  emergency_monthly_need numeric(12, 2) not null default 0,
  emergency_apy numeric(5, 2) not null default 0,
  monthly_contribution numeric(12, 2) not null default 0,
  risk_profile text not null default 'balanced' check (risk_profile in ('conservative', 'balanced', 'growth')),
  timeline_years integer not null default 10 check (timeline_years >= 1 and timeline_years <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_allocations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.wealth_profiles(id) on delete cascade,
  asset_key text not null,
  asset_label text not null,
  current_value numeric(12, 2) not null default 0,
  target_percent numeric(5, 2) not null default 0 check (target_percent >= 0 and target_percent <= 100),
  focus_rank integer check (focus_rank between 1 and 3),
  account_type text not null default 'taxable',
  liquidity text not null default 'medium' check (liquidity in ('high', 'medium', 'low')),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, asset_key)
);

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  url text not null,
  published_at date not null,
  summary text not null,
  topic text not null default 'markets',
  created_at timestamptz not null default now()
);

create index if not exists idx_asset_allocations_profile_id on public.asset_allocations(profile_id);
create index if not exists idx_news_items_published_at on public.news_items(published_at desc);
create unique index if not exists idx_news_items_url on public.news_items(url);

alter table public.wealth_profiles enable row level security;
alter table public.asset_allocations enable row level security;
alter table public.news_items enable row level security;

drop policy if exists "Session can read own wealth profile" on public.wealth_profiles;
drop policy if exists "Session can insert own wealth profile" on public.wealth_profiles;
drop policy if exists "Session can update own wealth profile" on public.wealth_profiles;
drop policy if exists "Session can delete own wealth profile" on public.wealth_profiles;

create policy "Session can read own wealth profile"
on public.wealth_profiles for select
to anon, authenticated
using (session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id');

create policy "Session can insert own wealth profile"
on public.wealth_profiles for insert
to anon, authenticated
with check (session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id');

create policy "Session can update own wealth profile"
on public.wealth_profiles for update
to anon, authenticated
using (session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id')
with check (session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id');

create policy "Session can delete own wealth profile"
on public.wealth_profiles for delete
to anon, authenticated
using (session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id');

drop policy if exists "Session can read own allocations" on public.asset_allocations;
drop policy if exists "Session can insert own allocations" on public.asset_allocations;
drop policy if exists "Session can update own allocations" on public.asset_allocations;
drop policy if exists "Session can delete own allocations" on public.asset_allocations;

create policy "Session can read own allocations"
on public.asset_allocations for select
to anon, authenticated
using (
  exists (
    select 1 from public.wealth_profiles p
    where p.id = asset_allocations.profile_id
      and p.session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id'
  )
);

create policy "Session can insert own allocations"
on public.asset_allocations for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.wealth_profiles p
    where p.id = asset_allocations.profile_id
      and p.session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id'
  )
);

create policy "Session can update own allocations"
on public.asset_allocations for update
to anon, authenticated
using (
  exists (
    select 1 from public.wealth_profiles p
    where p.id = asset_allocations.profile_id
      and p.session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id'
  )
)
with check (
  exists (
    select 1 from public.wealth_profiles p
    where p.id = asset_allocations.profile_id
      and p.session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id'
  )
);

create policy "Session can delete own allocations"
on public.asset_allocations for delete
to anon, authenticated
using (
  exists (
    select 1 from public.wealth_profiles p
    where p.id = asset_allocations.profile_id
      and p.session_id = coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json->>'x-wealth-session-id'
  )
);

drop policy if exists "Anyone can read news items" on public.news_items;
create policy "Anyone can read news items"
on public.news_items for select
to anon, authenticated
using (true);

insert into public.news_items (title, source, url, published_at, summary, topic)
values
  (
    'Savings rates remain central to emergency fund decisions in 2026',
    'Bankrate',
    'https://www.bankrate.com/banking/savings/savings-money-market-account-rate-forecast/',
    '2026-02-03',
    'High-yield savings may still outpace traditional bank savings, but expected rate cuts can reduce future APY.',
    'cash'
  ),
  (
    'CDs, high-yield savings, and money market accounts compete for short-term cash',
    'CBS News',
    'https://www.cbsnews.com/news/18000-cd-vs-high-yield-savings-account-money-market-account-earn-most-2026/',
    '2026-04-27',
    'Liquid accounts keep flexibility while CDs can lock yield, making liquidity a key emergency-fund tradeoff.',
    'cash'
  ),
  (
    'Treasury issuance and bill yields remain a watch item for cash allocations',
    'Wolf Street',
    'https://wolfstreet.com/2026/05/03/the-us-government-sold-723-billion-of-treasury-securities-this-week-inflation-jumped-and-met-t-bill-yields/',
    '2026-05-03',
    'Short-term Treasury supply and yield changes matter for investors comparing bills, CDs, and high-yield savings.',
    'treasuries'
  )
on conflict (url) do nothing;
