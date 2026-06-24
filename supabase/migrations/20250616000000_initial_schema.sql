-- Playbook: initial schema
-- Run via Supabase SQL editor or `supabase db push` after linking project.

-- ---------------------------------------------------------------------------
-- Categories (hierarchical: e.g. Pass Play → Rub Route)
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.categories (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, parent_id, slug)
);

create index categories_user_id_idx on public.categories (user_id);
create index categories_parent_id_idx on public.categories (parent_id);

alter table public.categories enable row level security;

create policy "Users manage own categories"
  on public.categories
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Plays (saved clips)
-- ---------------------------------------------------------------------------
create type public.play_status as enum (
  'pending',
  'processing',
  'ready',
  'failed'
);

create type public.source_platform as enum (
  'twitter',
  'instagram',
  'unknown'
);

create table public.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  source_url text not null,
  source_platform public.source_platform not null default 'unknown',
  title text,
  video_storage_path text,
  thumbnail_storage_path text,
  duration_seconds numeric,
  status public.play_status not null default 'pending',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plays_user_id_idx on public.plays (user_id);
create index plays_category_id_idx on public.plays (category_id);
create index plays_status_idx on public.plays (status);
create index plays_created_at_idx on public.plays (created_at desc);

alter table public.plays enable row level security;

create policy "Users read own plays"
  on public.plays
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own plays"
  on public.plays
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own plays"
  on public.plays
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own plays"
  on public.plays
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plays_set_updated_at
  before update on public.plays
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage bucket for play videos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'play-videos',
  'play-videos',
  false,
  104857600, -- 100 MB
  array['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Users can read their own folder: play-videos/{user_id}/...
create policy "Users read own play videos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'play-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users upload own play videos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'play-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own play videos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'play-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'play-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own play videos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'play-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Seed default categories for new users
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pass_id uuid;
  run_id uuid;
  rpo_id uuid;
begin
  insert into public.categories (user_id, name, slug, sort_order)
  values (new.id, 'Pass Plays', 'pass-plays', 1)
  returning id into pass_id;

  insert into public.categories (user_id, parent_id, name, slug, sort_order)
  values
    (new.id, pass_id, 'Rub Routes', 'rub-routes', 1),
    (new.id, pass_id, 'Screen Passes', 'screen-passes', 2),
    (new.id, pass_id, 'Deep Shots', 'deep-shots', 3);

  insert into public.categories (user_id, name, slug, sort_order)
  values (new.id, 'Run Plays', 'run-plays', 2)
  returning id into run_id;

  insert into public.categories (user_id, parent_id, name, slug, sort_order)
  values
    (new.id, run_id, 'Inside Zone', 'inside-zone', 1),
    (new.id, run_id, 'Outside Zone', 'outside-zone', 2);

  insert into public.categories (user_id, name, slug, sort_order)
  values (new.id, 'RPOs', 'rpos', 3)
  returning id into rpo_id;

  insert into public.categories (user_id, parent_id, name, slug, sort_order)
  values
    (new.id, rpo_id, 'Glance RPO', 'glance-rpo', 1),
    (new.id, rpo_id, 'Bubble RPO', 'bubble-rpo', 2);

  return new;
end;
$$;

create trigger on_auth_user_created_seed_categories
  after insert on auth.users
  for each row
  execute function public.seed_default_categories();
