alter table dance_training_plan_sections add column if not exists type text;
update dance_training_plan_sections set type = category where type is null;
alter table dance_training_plan_sections alter column type set default 'Training Session';

create table if not exists dance_training_plan_section_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references dance_training_plan_sections(id) on delete cascade,
  label text not null default '',
  notes text,
  minutes integer not null default 0,
  item_type text not null default 'field',
  type text not null default 'Pole tricks',
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table dance_training_plan_section_items enable row level security;

create index if not exists dance_training_plan_section_items_section_id_idx on dance_training_plan_section_items (section_id);

alter table dance_training_plan_section_items add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

create index if not exists dance_training_plan_section_items_user_id_idx on dance_training_plan_section_items (user_id);

insert into dance_training_plan_section_items (
  id,
  section_id,
  label,
  notes,
  minutes,
  item_type,
  type,
  completed,
  sort_order,
  created_at,
  updated_at,
  user_id
)
select
  id,
  section_id,
  label,
  null,
  0,
  'focus',
  type,
  completed,
  sort_order,
  created_at,
  updated_at,
  user_id
from dance_training_plan_focus_items
on conflict (id) do nothing;

drop policy if exists dance_training_plan_section_items_owner_access on dance_training_plan_section_items;

create policy dance_training_plan_section_items_owner_access
  on dance_training_plan_section_items
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
