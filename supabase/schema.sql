create extension if not exists pgcrypto;

create table if not exists categories (
  id text primary key,
  name text not null,
  color text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists habits (
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

create table if not exists habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id text not null references habits(id) on delete cascade,
  date date not null,
  value integer not null default 1,
  created_at timestamptz default now()
);

create table if not exists daily_checkins (
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

create table if not exists routines (
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

create table if not exists routine_entries (
  id uuid primary key default gen_random_uuid(),
  routine_id text not null references routines(id) on delete cascade,
  date date not null,
  completed_subtask_ids text[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists dance_checkins (
  id text primary key,
  week_of date not null,
  scores jsonb not null default '[]'::jsonb,
  reflection jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists dance_daily_statuses (
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

create table if not exists conditioning_routines (
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

create table if not exists conditioning_sessions (
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

create table if not exists weight_entries (
  id text primary key,
  date date not null,
  weight_kg numeric not null,
  body_fat_pct numeric,
  measurements jsonb,
  notes text,
  created_at timestamptz default now()
);

create table if not exists media_entries (
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

create table if not exists motivation_quotes (
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

create table if not exists dance_skills (
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

create table if not exists dance_skill_logs (
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

create index if not exists habits_category_id_idx on habits (category_id);
create index if not exists routines_category_id_idx on routines (category_id);
create index if not exists conditioning_sessions_routine_id_idx on conditioning_sessions (routine_id);
create index if not exists dance_skill_logs_skill_id_idx on dance_skill_logs (skill_id);

alter table categories add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table habits add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table habit_completions add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table daily_checkins add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table routines add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table routine_entries add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_checkins add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_daily_statuses add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table conditioning_routines add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table conditioning_sessions add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table weight_entries add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table media_entries add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table motivation_quotes add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_skills add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table dance_skill_logs add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

create index if not exists categories_user_id_idx on categories (user_id);
create index if not exists habits_user_id_idx on habits (user_id);
create index if not exists habit_completions_user_id_idx on habit_completions (user_id);
create index if not exists daily_checkins_user_id_idx on daily_checkins (user_id);
create index if not exists routines_user_id_idx on routines (user_id);
create index if not exists routine_entries_user_id_idx on routine_entries (user_id);
create index if not exists dance_checkins_user_id_idx on dance_checkins (user_id);
create index if not exists dance_daily_statuses_user_id_idx on dance_daily_statuses (user_id);
create index if not exists conditioning_routines_user_id_idx on conditioning_routines (user_id);
create index if not exists conditioning_sessions_user_id_idx on conditioning_sessions (user_id);
create index if not exists weight_entries_user_id_idx on weight_entries (user_id);
create index if not exists media_entries_user_id_idx on media_entries (user_id);
create index if not exists motivation_quotes_user_id_idx on motivation_quotes (user_id);
create index if not exists dance_skills_user_id_idx on dance_skills (user_id);
create index if not exists dance_skill_logs_user_id_idx on dance_skill_logs (user_id);

alter table daily_checkins drop constraint if exists daily_checkins_date_key;
alter table dance_checkins drop constraint if exists dance_checkins_week_of_key;
alter table habit_completions drop constraint if exists habit_completions_habit_id_date_key;
alter table routine_entries drop constraint if exists routine_entries_routine_id_date_key;
alter table daily_checkins drop constraint if exists daily_checkins_user_id_date_key;
alter table dance_checkins drop constraint if exists dance_checkins_user_id_week_of_key;
alter table dance_daily_statuses drop constraint if exists dance_daily_statuses_user_id_date_key;
alter table habit_completions drop constraint if exists habit_completions_user_id_habit_id_date_key;
alter table routine_entries drop constraint if exists routine_entries_user_id_routine_id_date_key;

alter table daily_checkins add constraint daily_checkins_user_id_date_key unique (user_id, date);
alter table dance_checkins add constraint dance_checkins_user_id_week_of_key unique (user_id, week_of);
alter table dance_daily_statuses add constraint dance_daily_statuses_user_id_date_key unique (user_id, date);
alter table habit_completions add constraint habit_completions_user_id_habit_id_date_key unique (user_id, habit_id, date);
alter table routine_entries add constraint routine_entries_user_id_routine_id_date_key unique (user_id, routine_id, date);

drop policy if exists categories_all_access on categories;
drop policy if exists habits_all_access on habits;
drop policy if exists habit_completions_all_access on habit_completions;
drop policy if exists daily_checkins_all_access on daily_checkins;
drop policy if exists routines_all_access on routines;
drop policy if exists routine_entries_all_access on routine_entries;
drop policy if exists dance_checkins_all_access on dance_checkins;
drop policy if exists dance_daily_statuses_all_access on dance_daily_statuses;
drop policy if exists conditioning_routines_all_access on conditioning_routines;
drop policy if exists conditioning_sessions_all_access on conditioning_sessions;
drop policy if exists weight_entries_all_access on weight_entries;
drop policy if exists media_entries_all_access on media_entries;
drop policy if exists motivation_quotes_all_access on motivation_quotes;
drop policy if exists dance_skills_all_access on dance_skills;
drop policy if exists dance_skill_logs_all_access on dance_skill_logs;
drop policy if exists categories_owner_access on categories;
drop policy if exists habits_owner_access on habits;
drop policy if exists habit_completions_owner_access on habit_completions;
drop policy if exists daily_checkins_owner_access on daily_checkins;
drop policy if exists routines_owner_access on routines;
drop policy if exists routine_entries_owner_access on routine_entries;
drop policy if exists dance_checkins_owner_access on dance_checkins;
drop policy if exists dance_daily_statuses_owner_access on dance_daily_statuses;
drop policy if exists conditioning_routines_owner_access on conditioning_routines;
drop policy if exists conditioning_sessions_owner_access on conditioning_sessions;
drop policy if exists weight_entries_owner_access on weight_entries;
drop policy if exists media_entries_owner_access on media_entries;
drop policy if exists motivation_quotes_owner_access on motivation_quotes;
drop policy if exists dance_skills_owner_access on dance_skills;
drop policy if exists dance_skill_logs_owner_access on dance_skill_logs;

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
