-- APNs config lives in Supabase Vault (secrets apns_private_key, apns_key_id,
-- apns_team_id, apns_bundle_id; inserted out-of-band, never committed).
create or replace function public.get_apns_config()
returns table(name text, value text) language sql security definer set search_path = public, vault as $$
  select name::text, decrypted_secret::text from vault.decrypted_secrets
  where name in ('apns_private_key','apns_key_id','apns_team_id','apns_bundle_id');
$$;
revoke all on function public.get_apns_config() from public, anon, authenticated;
grant execute on function public.get_apns_config() to service_role;
