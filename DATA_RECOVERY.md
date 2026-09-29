# Data Recovery Notes

## Current storage model

The app currently reads browser `localStorage` first and then starts an async Supabase sync when Supabase is configured and a Supabase session exists. This means localStorage is the primary UI cache, while Supabase is a background sync source.

## Current localStorage keys

- Habits: `habitflow-habits`
- Habit completions: `habitflow-completions`
- Categories: `habitflow-categories`
- Routines: `habitflow-routines`
- Routine entries: `habitflow-routine-entries-YYYY-MM`
- Daily check-ins: `wellness-daily-checkins`
- Dance check-ins: `danceflow-checkins`
- Dance daily statuses: `danceflow-daily`
- Dance skills: `danceflow-skills`
- Dance skill logs: `danceflow-skill-logs`
- Conditioning routines: `wellness-conditioning-routines`
- Conditioning sessions: `wellness-conditioning-sessions`
- Media vault entries: `wellness-media`
- Motivation quotes: `wellness-quotes`
- Weight entries: `wellness-weight`

## Legacy keys still checked by recovery tooling

- Old January 2025 habit completions: `habitflow-completions-jan2025`
- Old January 2025 routine entries: `habitflow-routine-entries-jan2025`
- Food logs: `wellness-nutrition`
- Nutrition goals: `wellness-nutrition-goals`
- Water logs: `wellness-water-entries`
- Water goal: `wellness-water-goal`
- Medications: `wellness-medications`
- Medication logs: `wellness-medication-logs`

## Supabase tables

The schema defines these user-scoped tables with `user_id` and RLS owner policies:

- `categories`
- `habits`
- `habit_completions`
- `daily_checkins`
- `routines`
- `routine_entries`
- `dance_checkins`
- `dance_daily_statuses`
- `conditioning_routines`
- `conditioning_sessions`
- `weight_entries`
- `media_entries`
- `motivation_quotes`
- `dance_skills`
- `dance_skill_logs`

Each policy is `for all to authenticated` and checks `auth.uid() = user_id`. The media vault storage bucket is private and also scoped by the authenticated user's folder.

## What caused the data to disappear

Recent changes introduced a mixed localStorage plus Supabase sync path and removed the interactive auth gate. The app still renders from localStorage, but Supabase sync can replace local cache data when remote rows are returned. With auth removed, Supabase sync may also silently do nothing because there is no authenticated session. Separately, older features used keys that are no longer loaded by active pages, so data under those legacy keys no longer appeared in the UI.

## What changed

- Added `src/lib/dataRecovery.ts`.
- The recovery layer creates an automatic localStorage backup before its first migration.
- It migrates old January 2025 habit completions into the current `habitflow-completions` shape when the current key is empty.
- It migrates old January 2025 routine entries into the current month routine-entry key when the current key is empty.
- It exposes counts and detected keys to a temporary Data Recovery panel in Settings.
- Supabase sync now merges remote and local rows before writing the local cache, so non-empty local data is not replaced by a smaller remote set.
- Empty local arrays are no longer pushed to Supabase as destructive deletes.

The migration is additive: it does not delete legacy keys or overwrite non-empty current keys.
