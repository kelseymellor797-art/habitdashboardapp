drop table if exists dance_skill_logs cascade;
drop table if exists dance_skills cascade;
drop table if exists motivation_quotes cascade;
drop table if exists media_entries cascade;
drop table if exists weight_entries cascade;
drop table if exists conditioning_sessions cascade;
drop table if exists conditioning_routines cascade;
drop table if exists dance_daily_statuses cascade;
drop table if exists dance_checkins cascade;
drop table if exists routine_entries cascade;
drop table if exists routines cascade;
drop table if exists daily_checkins cascade;
drop table if exists habit_completions cascade;
drop table if exists habits cascade;
drop table if exists categories cascade;

create extension if not exists pgcrypto;

create table categories (
  id text primary key,
  name text not null,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table habits (
  id text primary key,
  name text not null,
  schedule_type text not null default 'daily',
  custom_days integer[] default '{}',
  goal integer not null default 20,
  color text,
  active boolean not null default true,
  category_id text references categories(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id text not null references habits(id) on delete cascade,
  date date not null,
  value integer not null default 1,
  created_at timestamptz default now()
);

create table daily_checkins (
  id text primary key,
  date date not null,
  mood integer not null default 3,
  energy integer not null default 3,
  motivation integer not null default 3,
  confidence integer not null default 3,
  soreness integer not null default 3,
  flexibility_feeling integer not null default 3,
  strength_feeling integer not null default 3,
  trained_today boolean not null default false,
  training_type text,
  training_duration integer,
  mental_state_notes text,
  wins text,
  what_felt_hard text,
  goals_for_tomorrow text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table routines (
  id text primary key,
  name text not null,
  schedule_type text not null default 'daily',
  custom_days integer[] default '{}',
  color text,
  active boolean not null default true,
  subtasks jsonb not null default '[]'::jsonb,
  category_id text references categories(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table routine_entries (
  id uuid primary key default gen_random_uuid(),
  routine_id text not null references routines(id) on delete cascade,
  date date not null,
  completed_subtask_ids text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table dance_checkins (
  id text primary key,
  week_of date not null,
  scores jsonb not null default '[]'::jsonb,
  reflection jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table dance_daily_statuses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  mood integer not null default 3,
  soreness integer not null default 3,
  confidence integer not null default 3,
  trained_today boolean not null default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table conditioning_routines (
  id text primary key,
  name text not null,
  category text not null,
  exercises jsonb not null default '[]'::jsonb,
  estimated_duration integer,
  difficulty integer not null default 3,
  notes text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table conditioning_sessions (
  id text primary key,
  routine_id text references conditioning_routines(id) on delete set null,
  routine_name text not null,
  date date not null,
  duration integer,
  completed_exercises text[] not null default '{}',
  difficulty integer not null default 3,
  notes text,
  created_at timestamptz default now()
);

create table weight_entries (
  id text primary key,
  date date not null,
  weight_kg numeric not null,
  body_fat_pct numeric,
  measurements jsonb,
  notes text,
  created_at timestamptz default now()
);

create table media_entries (
  id text primary key,
  title text not null,
  date date not null,
  url text not null,
  tags text[] not null default '{}',
  skill_name text,
  confidence_rating integer,
  notes text,
  created_at timestamptz default now()
);

create table motivation_quotes (
  id text primary key,
  text text not null,
  author text,
  category text not null default 'general',
  is_favorite boolean not null default false,
  is_active boolean not null default true,
  is_custom boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table dance_skills (
  id text primary key,
  name text not null,
  category text not null,
  tags text[] default '{}',
  notes text,
  active boolean not null default true,
  current_status text not null default 'not_started',
  date_created date not null,
  date_first_landed date,
  needs_spotting boolean,
  needs_conditioning boolean,
  needs_flexibility boolean,
  mentally_blocked boolean,
  updated_at timestamptz default now()
);

create table dance_skill_logs (
  id text primary key,
  skill_id text not null references dance_skills(id) on delete cascade,
  date date not null,
  confidence_before integer not null,
  confidence_after integer,
  fear_level integer,
  form_quality integer,
  effort_level integer,
  outcome text not null,
  attempted boolean not null default true,
  notes text,
  filmed boolean,
  created_at timestamptz default now()
);

alter table categories enable row level security;
alter table habits enable row level security;
alter table habit_completions enable row level security;
alter table daily_checkins enable row level security;
alter table routines enable row level security;
alter table routine_entries enable row level security;
alter table dance_checkins enable row level security;
alter table dance_daily_statuses enable row level security;
alter table conditioning_routines enable row level security;
alter table conditioning_sessions enable row level security;
alter table weight_entries enable row level security;
alter table media_entries enable row level security;
alter table motivation_quotes enable row level security;
alter table dance_skills enable row level security;
alter table dance_skill_logs enable row level security;

create index habits_category_id_idx on habits (category_id);
create index routines_category_id_idx on routines (category_id);
create index conditioning_sessions_routine_id_idx on conditioning_sessions (routine_id);
create index dance_skill_logs_skill_id_idx on dance_skill_logs (skill_id);

alter table categories add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table habits add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table habit_completions add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table daily_checkins add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table routines add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table routine_entries add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_checkins add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_daily_statuses add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table conditioning_routines add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table conditioning_sessions add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table weight_entries add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table media_entries add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table motivation_quotes add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_skills add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_skill_logs add column user_id uuid references auth.users(id) on delete cascade default auth.uid();

create index categories_user_id_idx on categories (user_id);
create index habits_user_id_idx on habits (user_id);
create index habit_completions_user_id_idx on habit_completions (user_id);
create index daily_checkins_user_id_idx on daily_checkins (user_id);
create index routines_user_id_idx on routines (user_id);
create index routine_entries_user_id_idx on routine_entries (user_id);
create index dance_checkins_user_id_idx on dance_checkins (user_id);
create index dance_daily_statuses_user_id_idx on dance_daily_statuses (user_id);
create index conditioning_routines_user_id_idx on conditioning_routines (user_id);
create index conditioning_sessions_user_id_idx on conditioning_sessions (user_id);
create index weight_entries_user_id_idx on weight_entries (user_id);
create index media_entries_user_id_idx on media_entries (user_id);
create index motivation_quotes_user_id_idx on motivation_quotes (user_id);
create index dance_skills_user_id_idx on dance_skills (user_id);
create index dance_skill_logs_user_id_idx on dance_skill_logs (user_id);

alter table daily_checkins add constraint daily_checkins_user_id_date_key unique (user_id, date);
alter table dance_checkins add constraint dance_checkins_user_id_week_of_key unique (user_id, week_of);
alter table dance_daily_statuses add constraint dance_daily_statuses_user_id_date_key unique (user_id, date);
alter table habit_completions add constraint habit_completions_user_id_habit_id_date_key unique (user_id, habit_id, date);
alter table routine_entries add constraint routine_entries_user_id_routine_id_date_key unique (user_id, routine_id, date);

create policy categories_owner_access on categories for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy habits_owner_access on habits for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy habit_completions_owner_access on habit_completions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy daily_checkins_owner_access on daily_checkins for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routines_owner_access on routines for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy routine_entries_owner_access on routine_entries for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dance_checkins_owner_access on dance_checkins for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dance_daily_statuses_owner_access on dance_daily_statuses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy conditioning_routines_owner_access on conditioning_routines for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy conditioning_sessions_owner_access on conditioning_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy weight_entries_owner_access on weight_entries for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy media_entries_owner_access on media_entries for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy motivation_quotes_owner_access on motivation_quotes for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dance_skills_owner_access on dance_skills for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy dance_skill_logs_owner_access on dance_skill_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('media-vault', 'media-vault', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = 524288000;

drop policy if exists media_vault_select_own on storage.objects;
drop policy if exists media_vault_insert_own on storage.objects;
drop policy if exists media_vault_update_own on storage.objects;
drop policy if exists media_vault_delete_own on storage.objects;

create policy media_vault_select_own on storage.objects
for select to authenticated
using (
  bucket_id = 'media-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy media_vault_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'media-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy media_vault_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'media-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'media-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy media_vault_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'media-vault'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
