import { supabase } from "./supabase";

/** Persist a shared URL to the logged-in user's plays table via edge function. */
export async function ingestPlayToAccount(
  sourceUrl: string,
  categoryId?: string | null,
  title?: string | null,
): Promise<{ ok: boolean; error?: string; play?: Record<string, unknown> }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { ok: false, error: "Not signed in" };
  }

  const body: Record<string, unknown> = { source_url: sourceUrl };
  if (categoryId) body.category_id = categoryId;
  if (title) body.title = title;

  const { data, error } = await supabase.functions.invoke("ingest-shared-url", { body });
  if (error) return { ok: false, error: error.message };
  return { ok: true, play: (data as { play?: Record<string, unknown> })?.play };
}
