import { supabase } from "./supabase";
import { NativeBridge } from "./nativeBridge";

const USER_PLAYS_KEY = "playbook.userPlays.v1";

/** Clear local playbook cache after sign-out / account deletion. */
export function clearLocalUserData() {
  try {
    localStorage.removeItem(USER_PLAYS_KEY);
    localStorage.removeItem("playbook.isPro");
  } catch {
    // ignore quota / private mode
  }
  NativeBridge.syncAuthToken(null);
}

/** Sign out of Supabase and clear App Group token via native bridge. */
export async function signOutAccount(): Promise<{ ok: boolean; error?: string }> {
  clearLocalUserData();
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Permanently delete the authenticated account (App Store requirement).
 * Calls the delete-account edge function, then signs out locally.
 */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { ok: false, error: "Not signed in" };
  }

  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    return { ok: false, error: String((data as { error: string }).error) };
  }

  clearLocalUserData();
  await supabase.auth.signOut();
  return { ok: true };
}

/** Push the current access token to the native App Group for the Share Extension. */
export async function syncAuthTokenToNative() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? null;
  NativeBridge.syncAuthToken(token);
}
