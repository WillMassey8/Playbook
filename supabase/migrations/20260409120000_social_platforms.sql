-- Add TikTok and Facebook to supported source platforms.
-- Playback remains link + official embed URL based (no re-hosted social video).

alter type public.source_platform add value if not exists 'tiktok';
alter type public.source_platform add value if not exists 'facebook';

comment on type public.source_platform is
  'Social origin for a saved play. In-app playback uses official embed URLs only.';
