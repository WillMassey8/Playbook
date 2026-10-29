-- Shared feed: every coach's saved clips appear in everyone's For You feed.
-- Exposes only clip-level fields (no user_id / email); plays RLS stays owner-only.
create or replace function public.feed_plays(max_rows integer default 100)
returns table (
  id uuid,
  source_url text,
  source_platform text,
  title text,
  thumbnail_url text,
  embed_url text,
  category_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select * from (
    select distinct on (p.source_url)
      p.id, p.source_url, p.source_platform::text, p.title,
      p.thumbnail_url, p.embed_url, c.name, p.created_at
    from public.plays p
    left join public.categories c on c.id = p.category_id
    where p.source_url is not null
    order by p.source_url, (p.category_id is null), p.created_at desc
  ) t
  order by t.created_at desc
  limit least(greatest(coalesce(max_rows, 100), 1), 200);
$$;

revoke all on function public.feed_plays(integer) from public, anon;
grant execute on function public.feed_plays(integer) to authenticated;
