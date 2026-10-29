import { supabase } from "./supabase";
import { NativeBridge } from "./nativeBridge";

export type PushStatus = "authorized" | "denied" | "notDetermined" | "provisional" | "unavailable";
export type NotificationPrefs = { saves: boolean; feed: boolean; updates: boolean };
export const DEFAULT_PREFS: NotificationPrefs = { saves: true, feed: true, updates: true };

// Stays "unavailable" until the native shell answers, so older app builds (no push support) hide the settings.
let lastStatus: PushStatus = "unavailable";
const listeners = new Set<(s: PushStatus) => void>();
let installed = false;

async function saveToken(token: string, environment: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await supabase.rpc("register_device_token", { p_token: token, p_environment: environment });
}

/** Install once at app start: listens for native push events and stores the device token. */
export function installPushBridge() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("pb-push-status", (e) => {
    lastStatus = ((e as CustomEvent).detail?.status ?? "notDetermined") as PushStatus;
    listeners.forEach((l) => l(lastStatus));
  });
  window.addEventListener("pb-push-token", (e) => {
    const d = (e as CustomEvent).detail ?? {};
    if (typeof d.token === "string") void saveToken(d.token, d.environment ?? "production");
  });
  if (NativeBridge.available) NativeBridge.pushStatus();
}

/** Call after sign-in so an already-granted device re-registers under this account. */
export function refreshPushRegistration() {
  if (NativeBridge.available) NativeBridge.pushStatus();
}

export function onPushStatus(fn: (s: PushStatus) => void) {
  listeners.add(fn);
  fn(lastStatus);
  return () => { listeners.delete(fn); };
}

export async function loadPrefs(): Promise<NotificationPrefs> {
  const { data } = await supabase.from("notification_prefs").select("saves, feed, updates").maybeSingle();
  return data ? { saves: data.saves, feed: data.feed, updates: data.updates } : DEFAULT_PREFS;
}

export async function savePrefs(prefs: NotificationPrefs) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("notification_prefs").upsert(
    { user_id: u.user.id, ...prefs, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}
