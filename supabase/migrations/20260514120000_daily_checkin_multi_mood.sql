alter table daily_checkins add column if not exists mood_feeling text;
alter table daily_checkins add column if not exists mood_feelings text[] default '{}';
alter table daily_checkins add column if not exists mood_category text;
