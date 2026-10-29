/**
 * Bridge contract between the WebView web app (preview/) and the native
 * com.wymas.Playbook shell.
 *
 * Web → native  (window.webkit.messageHandlers.playbook.postMessage)
 *   { type: "signInWithApple" }
 *   { type: "requestPendingShares" }
 *   { type: "syncAuthToken", token: string | null }
 *     Write/clear JWT in App Group so the Share Extension can best-effort ingest.
 *   { type: "openURL", url: string }
 *     Open in Safari / SFSafariViewController (privacy, terms, source posts).
 *   { type: "purchase", plan }
 *   { type: "restore" }
 *   { type: "categorizedIngested", urls: string[] }
 *   { type: "pushStatus" }        → native replies with pb-push-status (+ pb-push-token if registered)
 *   { type: "requestPush" }       → shows the iOS permission prompt, then pb-push-status
 *   { type: "openSettings" }      → opens PlaySave in iOS Settings (to re-enable notifications)
 *
 * Native → web
 *   CustomEvent "pb-apple-session"
 *     detail: { idToken: string, nonce: string } | { token: string, nonce: string }
 *             | { error: string }
 *     Web then calls:
 *       supabase.auth.signInWithIdToken({ provider: "apple", token: idToken, nonce })
 *
 *   CustomEvent "pb-add-categorized"
 *     detail: { items: Array<{ url: string, categoryId?: string, categoryName?: string }> }
 *     Bare urls (no categoryId) = inbox / full-screen categorize.
 *
 *   window.__pbPendingCategorized
 *     Same shape as detail.items — race-proof stash before the listener mounts.
 *
 *   CustomEvent "pb-push-status"  detail: { status: "authorized"|"denied"|"notDetermined"|"provisional" }
 *   CustomEvent "pb-push-token"   detail: { token: string, environment: "production"|"sandbox" }
 *
 * Full shell reference: /NATIVE_BRIDGE.md
 */

export type PendingShareItem = {
  url: string;
  categoryId?: string;
  categoryName?: string;
};

export type AppleSessionDetail =
  | { idToken: string; nonce: string; error?: undefined }
  | { token: string; nonce: string; error?: undefined }
  | { error: string; idToken?: undefined; token?: undefined; nonce?: undefined };

declare global {
  interface Window {
    __pbPendingCategorized?: PendingShareItem[];
    __pbPro?: boolean;
    webkit?: {
      messageHandlers?: {
        playbook?: { postMessage: (msg: Record<string, unknown>) => void };
      };
    };
  }
}

export const NativeBridge = {
  get available(): boolean {
    return typeof window !== "undefined" && !!window.webkit?.messageHandlers?.playbook;
  },
  post(msg: Record<string, unknown>) {
    window.webkit?.messageHandlers?.playbook?.postMessage(msg);
  },
  purchase(plan: string) {
    this.post({ type: "purchase", plan });
  },
  restore() {
    this.post({ type: "restore" });
  },
  signInWithApple() {
    this.post({ type: "signInWithApple" });
  },
  requestPendingShares() {
    this.post({ type: "requestPendingShares" });
  },
  /** Persist (or clear) the Supabase access token in the App Group for Share Extension. */
  syncAuthToken(token: string | null) {
    this.post({ type: "syncAuthToken", token });
  },
  pushStatus() { this.post({ type: "pushStatus" }); },
  requestPush() { this.post({ type: "requestPush" }); },
  openSettings() { this.post({ type: "openSettings" }); },
  categorizedIngested(urls: string[]) {
    this.post({ type: "categorizedIngested", urls });
  },
  /** Apple's manage-subscriptions sheet (change plan / cancel). */
  manageSubscriptions() {
    this.post({ type: "manageSubscriptions" });
  },
  /** Open an http(s) URL in the system browser (WKWebView-safe). */
  openURL(url: string) {
    this.post({ type: "openURL", url });
  },
};

/** Open a URL via native Safari when bridged; otherwise window.open / navigate. */
export function openExternal(url: string) {
  if (!url) return;
  const absolute = /^https?:\/\//i.test(url)
    ? url
    : new URL(url, window.location.origin).href;
  if (NativeBridge.available) {
    NativeBridge.openURL(absolute);
    return;
  }
  const opened = window.open(absolute, "_blank", "noopener,noreferrer");
  if (!opened) {
    // Popup blocked (common in embedded previews) — same-tab fallback.
    window.location.assign(absolute);
  }
}

/** Apply a native Apple identity token to the Supabase session. */
export async function applyAppleSession(
  detail: AppleSessionDetail,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if ("error" in detail && detail.error) {
    return { ok: false, error: detail.error };
  }
  const token =
    "idToken" in detail && detail.idToken
      ? detail.idToken
      : "token" in detail
        ? detail.token
        : undefined;
  const nonce = "nonce" in detail ? detail.nonce : undefined;
  if (!token || !nonce) {
    return { ok: false, error: "Apple Sign In missing idToken/nonce from native." };
  }

  const { supabase } = await import("./supabase");
  // Dynamic import keeps this module usable from unit tests without a window;
  // App.tsx also imports supabase statically (single chunk in production).
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token,
    nonce,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
