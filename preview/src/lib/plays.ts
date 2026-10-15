import { supabase } from "./supabase";
import { canonicalizeSourceUrl } from "./urls";

/** Persist a shared URL to the logged-in user's plays table via edge function. */
export async function ingestPlayToAccount(
  sourceUrl: string,
  categoryId?: string | null,
  title?: string | null,
  categoryName?: string | null,
): Promise<{ ok: boolean; error?: string; play?: Record<string, unknown> }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { ok: false, error: "Not signed in" };
  }

  let normalized = sourceUrl;
  try { normalized = canonicalizeSourceUrl(sourceUrl); } catch { /* keep raw */ }
  const body: Record<string, unknown> = { source_url: normalized };
  if (categoryId) body.category_id = categoryId;
  if (categoryName) body.category_name = categoryName;
  if (title) body.title = title;

  const { data, error } = await supabase.functions.invoke("ingest-shared-url", { body });
  if (error) return { ok: false, error: error.message };
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    return { ok: false, error: String((data as { error: string }).error) };
  }
  return { ok: true, play: (data as { play?: Record<string, unknown> })?.play };
}

export type RemotePlayRow = {
  id: string;
  source_url: string;
  title: string | null;
  category_id: string | null;
  source_platform: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

/** Load the signed-in user's plays from Supabase (durable across devices). */
export async function fetchRemotePlays(): Promise<RemotePlayRow[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return [];

  const { data, error } = await supabase
    .from("plays")
    .select("id, source_url, title, category_id, source_platform, embed_url, thumbnail_url, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as RemotePlayRow[];
}

export type RemoteCategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
};

export async function fetchRemoteCategories(): Promise<RemoteCategoryRow[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, parent_id, slug")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as RemoteCategoryRow[];
}
