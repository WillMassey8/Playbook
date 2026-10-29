import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * send-push — APNs sender for PlaySave.
 *
 *  { type: "play_saved", play_id }   called by the plays insert trigger.
 *     Safe to call publicly: it only acts on a real play created in the last
 *     10 minutes that has not been announced yet (plays.push_sent_at).
 *     → owner gets "Saved to your Playbook" (pref: saves)
 *     → other coaches get "New play in the feed" (pref: feed, max 1 per 6h)
 *
 *  { type: "broadcast", title, body }  PlaySave updates (pref: updates).
 *     Requires Authorization: Bearer <service role key>.
 *
 * Secrets (supabase secrets set ...): APNS_KEY_ID, APNS_TEAM_ID,
 * APNS_PRIVATE_KEY (contents of the AuthKey_XXXX.p8), APNS_BUNDLE_ID (default com.wymas.Playbook).
 * Without them the function returns { skipped: "apns_not_configured" }.
 */

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, serviceKey);

const KEY_ID = Deno.env.get("APNS_KEY_ID");
const TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "QDC2GGJ44D";
const PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY");
const BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "com.wymas.Playbook";
const FEED_THROTTLE_MS = 6 * 60 * 60 * 1000;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

function b64url(buf: ArrayBuffer | Uint8Array | string) {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedJwt: { token: string; at: number } | null = null;
async function apnsJwt(): Promise<string> {
  if (cachedJwt && Date.now() - cachedJwt.at < 40 * 60 * 1000) return cachedJwt.token;
  const pem = PRIVATE_KEY!.replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64url(JSON.stringify({ alg: "ES256", kid: KEY_ID }));
  const claims = b64url(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${claims}`));
  const token = `${head}.${claims}.${b64url(sig)}`;
  cachedJwt = { token, at: Date.now() };
  return token;
}

type Msg = { title: string; body: string; data?: Record<string, unknown> };

async function sendToUsers(userIds: string[], msg: Msg) {
  if (!userIds.length) return { sent: 0, failed: 0 };
  const { data: tokens } = await admin.from("device_tokens").select("token, environment").in("user_id", userIds);
  const jwt = await apnsJwt();
  let sent = 0, failed = 0;
  for (const t of tokens ?? []) {
    const host = t.environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
    const res = await fetch(`https://${host}/3/device/${t.token}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
      },
      body: JSON.stringify({ aps: { alert: { title: msg.title, body: msg.body }, sound: "default" }, ...(msg.data ?? {}) }),
    });
    if (res.ok) { sent++; continue; }
    failed++;
    const reason = (await res.json().catch(() => ({})))?.reason;
    if (res.status === 410 || reason === "BadDeviceToken" || reason === "Unregistered") {
      await admin.from("device_tokens").delete().eq("token", t.token);
    }
  }
  return { sent, failed };
}

async function prefsFor(userIds: string[]) {
  const { data } = await admin.from("notification_prefs").select("*").in("user_id", userIds);
  const m = new Map((data ?? []).map((p) => [p.user_id, p]));
  return (id: string) => m.get(id) ?? { saves: true, feed: true, updates: true, last_feed_push_at: null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const payload = await req.json().catch(() => ({}));
  if (!KEY_ID || !PRIVATE_KEY) return json({ skipped: "apns_not_configured" });

  if (payload.type === "broadcast") {
    if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) return json({ error: "forbidden" }, 403);
    if (!payload.title || !payload.body) return json({ error: "title and body required" }, 400);
    const { data: rows } = await admin.from("device_tokens").select("user_id");
    const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
    const pref = await prefsFor(ids);
    return json(await sendToUsers(ids.filter((id) => pref(id).updates), { title: payload.title, body: payload.body }));
  }

  if (payload.type === "play_saved" && typeof payload.play_id === "string") {
    // Claim the play atomically so it's announced at most once.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: play } = await admin.from("plays")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", payload.play_id).is("push_sent_at", null).gte("created_at", since)
      .select("id, user_id, title, source_platform").maybeSingle();
    if (!play) return json({ skipped: "not_eligible" });

    const title = (play.title ?? "").trim().slice(0, 80) || "New clip";
    const results: Record<string, unknown> = {};

    const ownerPref = (await prefsFor([play.user_id]))(play.user_id);
    if (ownerPref.saves) {
      results.owner = await sendToUsers([play.user_id], {
        title: "Saved to your Playbook", body: title, data: { play_id: play.id, kind: "saved" },
      });
    }

    const { data: rows } = await admin.from("device_tokens").select("user_id").neq("user_id", play.user_id);
    const others = [...new Set((rows ?? []).map((r) => r.user_id))];
    const pref = await prefsFor(others);
    const now = Date.now();
    const due = others.filter((id) => {
      const p = pref(id);
      return p.feed && (!p.last_feed_push_at || now - new Date(p.last_feed_push_at).getTime() > FEED_THROTTLE_MS);
    });
    if (due.length) {
      await admin.from("notification_prefs").upsert(
        due.map((id) => ({ user_id: id, last_feed_push_at: new Date(now).toISOString() })),
        { onConflict: "user_id", ignoreDuplicates: false },
      );
      results.feed = await sendToUsers(due, {
        title: "New play in the feed", body: title, data: { play_id: play.id, kind: "feed" },
      });
    }
    return json(results);
  }
  return json({ error: "unknown type" }, 400);
});
