alter table dance_skill_logs add column if not exists skill_name text;
alter table dance_skill_logs add column if not exists category text;
alter table dance_skill_logs add column if not exists attempts integer default 1;
alter table dance_skill_logs add column if not exists confidence integer;
alter table dance_skill_logs add column if not exists media_id text;
alter table dance_skill_logs add column if not exists tags text[] default '{}';
alter table dance_skill_logs add column if not exists win boolean default false;

update dance_skill_logs
set
  attempts = coalesce(attempts, case when attempted then 1 else 0 end),
  confidence = coalesce(confidence, confidence_after, confidence_before),
  tags = coalesce(tags, '{}'),
  win = coalesce(win, false);
