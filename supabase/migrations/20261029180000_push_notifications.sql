-- Push notifications: device tokens, per-user preferences, and a trigger that
-- asks the send-push edge function to notify when a play is saved.
create extension if not exists pg_net with schema extensions;

create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'ios',
  environment text not null default 'production' check (environment in ('production','sandbox')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);
alter table public.device_tokens enable row level security;
drop policy if exists "own tokens select" on public.device_tokens;
drop policy if exists "own tokens insert" on public.device_tokens;
drop policy if exists "own tokens update" on public.device_tokens;
drop policy if exists "own tokens delete" on public.device_tokens;
create policy "own tokens select" on public.device_tokens for select to authenticated using (user_id = auth.uid());
create policy "own tokens insert" on public.device_tokens for insert to authenticated with check (user_id = auth.uid());
create policy "own tokens update" on public.device_tokens for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tokens delete" on public.device_tokens for delete to authenticated using (user_id = auth.uid());

-- A device that switches accounts: let the new owner claim the token.
create or replace function public.register_device_token(p_token text, p_environment text default 'production')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.device_tokens(token, user_id, environment, updated_at)
  values (p_token, auth.uid(), case when p_environment = 'sandbox' then 'sandbox' else 'production' end, now())
  on conflict (token) do update set user_id = excluded.user_id, environment = excluded.environment, updated_at = now();
end $$;
revoke all on function public.register_device_token(text, text) from public, anon;
grant execute on function public.register_device_token(text, text) to authenticated;

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  saves boolean not null default true,      -- "Saved to your Playbook" confirmations
  feed boolean not null default true,       -- new plays from other coaches (throttled)
  updates boolean not null default true,    -- PlaySave news / feature updates
  last_feed_push_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "own prefs select" on public.notification_prefs;
drop policy if exists "own prefs insert" on public.notification_prefs;
drop policy if exists "own prefs update" on public.notification_prefs;
create policy "own prefs select" on public.notification_prefs for select to authenticated using (user_id = auth.uid());
create policy "own prefs insert" on public.notification_prefs for insert to authenticated with check (user_id = auth.uid());
create policy "own prefs update" on public.notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Idempotency marker so a play is only ever announced once.
alter table public.plays add column if not exists push_sent_at timestamptz;

create or replace function public.notify_play_saved()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://riwjijzjqfdsfocnzria.supabase.co/functions/v1/send-push',
    body := jsonb_build_object('type', 'play_saved', 'play_id', new.id),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  return new;
exception when others then
  return new; -- never block a save because of notifications
end $$;

drop trigger if exists plays_notify_saved on public.plays;
create trigger plays_notify_saved after insert on public.plays
  for each row execute function public.notify_play_saved();
