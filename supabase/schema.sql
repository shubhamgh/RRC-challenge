-- RRC challenge schema. Run in the Supabase SQL editor.
-- Do not put the service-role key in the frontend. The browser uses the anon key only.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id text primary key check (id in ('short', 'main')),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  entry_amount_inr integer not null,
  finalized boolean not null default false
);

create table if not exists public.payments (
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  challenge_id text not null references public.challenges (id) on delete cascade,
  status text not null check (status in ('pending', 'paid')),
  updated_at timestamptz not null default now(),
  primary key (athlete_id, challenge_id)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  activity_type text not null check (activity_type in ('running', 'swimming', 'cycling', 'football')),
  activity_date date not null,
  duration_seconds integer not null check (duration_seconds > 0),
  evidence_url text,
  admin_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_prizes (
  challenge_id text not null references public.challenges (id) on delete cascade,
  week_index integer not null,
  start_date date not null,
  end_date date not null,
  winner_athlete_id uuid references public.athletes (id) on delete set null,
  prize_amount_inr integer not null default 0,
  rounding_note text,
  tie_athlete_ids uuid[] not null default '{}',
  tie_rule text,
  admin_decision_note text,
  recorded boolean not null default false,
  primary key (challenge_id, week_index)
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists activities_athlete_date_idx on public.activities (athlete_id, activity_date);
create index if not exists activities_status_idx on public.activities (status);

insert into public.challenges (id, name, starts_on, ends_on, entry_amount_inr, finalized)
values
  ('short', 'Short challenge', '2026-11-14', '2026-12-19', 20, false),
  ('main', 'Main challenge', '2026-11-14', '2027-01-16', 101, false)
on conflict (id) do nothing;

alter table public.admin_users enable row level security;
alter table public.athletes enable row level security;
alter table public.challenges enable row level security;
alter table public.payments enable row level security;
alter table public.activities enable row level security;
alter table public.weekly_prizes enable row level security;
alter table public.site_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select using (user_id = auth.uid());

drop policy if exists athletes_read on public.athletes;
create policy athletes_read on public.athletes for select using (true);
drop policy if exists athletes_admin_write on public.athletes;
create policy athletes_admin_write on public.athletes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges for select using (true);
drop policy if exists challenges_admin_write on public.challenges;
create policy challenges_admin_write on public.challenges
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select using (true);
drop policy if exists payments_admin_write on public.payments;
create policy payments_admin_write on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists activities_read on public.activities;
create policy activities_read on public.activities
  for select using (status = 'approved' or public.is_admin());
drop policy if exists activities_admin_write on public.activities;
create policy activities_admin_write on public.activities
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists weekly_read on public.weekly_prizes;
create policy weekly_read on public.weekly_prizes for select using (true);
drop policy if exists weekly_admin_write on public.weekly_prizes;
create policy weekly_admin_write on public.weekly_prizes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.site_settings;
create policy settings_read on public.site_settings for select using (true);
drop policy if exists settings_admin_write on public.site_settings;
create policy settings_admin_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists site_assets_public_read on storage.objects;
create policy site_assets_public_read on storage.objects
  for select using (bucket_id = 'site-assets');

drop policy if exists site_assets_admin_write on storage.objects;
create policy site_assets_admin_write on storage.objects
  for all using (bucket_id = 'site-assets' and public.is_admin())
  with check (bucket_id = 'site-assets' and public.is_admin());
