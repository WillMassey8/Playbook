/**
 * Streams a temporary X video URL through this origin.
 * video.twimg.com returns 403 when the Referer is the PlaySave app, which
 * leaves a black <video> in WKWebView. Bytes are not stored.
 */

export const runtime = "edge";

export default async function handler(request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get("url") || "";
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "video.twimg.com") {
    return new Response("invalid url", { status: 400 });
  }

  const headers = new Headers();
  headers.set("User-Agent", "Mozilla/5.0");
  headers.set("Referer", "https://x.com/");
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  let upstream;
  try {
    upstream = await fetch(parsed.toString(), { headers });
  } catch {
    return new Response("upstream failed", { status: 502 });
  }

  const out = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  out.set("Cache-Control", "public, max-age=300");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
