create extension if not exists pgcrypto;

create table if not exists dance_training_plans (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null default 'Daily Training Plan',
  training_prep jsonb not null default '{}'::jsonb,
  warm_up jsonb not null default '{}'::jsonb,
  break_1 jsonb not null default '{}'::jsonb,
  training_session_1 jsonb not null default '{}'::jsonb,
  break_2 jsonb not null default '{}'::jsonb,
  training_session_2 jsonb not null default '{}'::jsonb,
  break_3 jsonb not null default '{}'::jsonb,
  training_session_3 jsonb not null default '{}'::jsonb,
  training_clean_up jsonb not null default '{}'::jsonb,
  active_training_time integer not null default 0,
  total_plan_time integer not null default 0,
  total_blocked_time integer not null default 0,
  break_prep_cleanup_time integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table dance_training_plans add column if not exists title text not null default 'Daily Training Plan';
alter table dance_training_plans add column if not exists total_plan_time integer not null default 0;
alter table dance_training_plans add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_training_plans enable row level security;
create index if not exists dance_training_plans_user_id_idx on dance_training_plans (user_id);

alter table dance_training_plans drop constraint if exists dance_training_plans_user_id_date_key;
alter table dance_training_plans add constraint dance_training_plans_user_id_date_key unique (user_id, date);

drop policy if exists dance_training_plans_owner_access on dance_training_plans;
create policy dance_training_plans_owner_access
  on dance_training_plans
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists dance_training_plan_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references dance_training_plans(id) on delete cascade,
  category text not null,
  title text not null,
  notes text,
  minutes integer not null default 0,
  counts_as_active_time boolean not null default false,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists dance_training_plan_focus_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references dance_training_plan_sections(id) on delete cascade,
  label text not null default '',
  type text not null default 'Pole tricks',
  difficulty text not null default 'Medium',
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table dance_training_plan_sections enable row level security;
alter table dance_training_plan_focus_items enable row level security;

create index if not exists dance_training_plan_sections_plan_id_idx on dance_training_plan_sections (plan_id);
create index if not exists dance_training_plan_focus_items_section_id_idx on dance_training_plan_focus_items (section_id);

alter table dance_training_plan_sections add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_training_plan_focus_items add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

create index if not exists dance_training_plan_sections_user_id_idx on dance_training_plan_sections (user_id);
create index if not exists dance_training_plan_focus_items_user_id_idx on dance_training_plan_focus_items (user_id);

drop policy if exists dance_training_plan_sections_owner_access on dance_training_plan_sections;
drop policy if exists dance_training_plan_focus_items_owner_access on dance_training_plan_focus_items;

create policy dance_training_plan_sections_owner_access
  on dance_training_plan_sections
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy dance_training_plan_focus_items_owner_access
  on dance_training_plan_focus_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
