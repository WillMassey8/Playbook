-- Prevent duplicate plays for the same user + source URL (share + web race).
-- Keep the row that already has a category; otherwise keep the newest.

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, source_url
      order by
        (category_id is not null) desc,
        updated_at desc nulls last,
        created_at desc
    ) as rn
  from public.plays
)
delete from public.plays p
using ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists plays_user_id_source_url_uidx
  on public.plays (user_id, source_url);

comment on index public.plays_user_id_source_url_uidx is
  'Idempotent share ingest: one play row per user per canonical source_url';
