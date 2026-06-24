-- Link-based plays: store reference metadata, not re-hosted video (App Store 5.2.3 safe)
alter table public.plays
  add column if not exists thumbnail_url text,
  add column if not exists embed_url text;

comment on column public.plays.thumbnail_url is 'Preview image URL from oEmbed/Open Graph (not stored video)';
comment on column public.plays.embed_url is 'Official embed URL for in-app playback (e.g. platform.twitter.com embed)';
comment on column public.plays.video_storage_path is 'Only for user-uploaded clips the coach owns — not third-party social downloads';
