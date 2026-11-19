/**
 * Streams a temporary X video URL through this origin.
 * video.twimg.com returns 403 when the Referer is the PlaySave app, which
 * leaves a black <video> in WKWebView. Bytes are not stored.
 *
 * Vercel runs this file as a Node function unless config.runtime is edge.
 * Node's request.url is a path, so the URL is resolved against a dummy base.
 */
export const config = { runtime: "edge" };

function targetFrom(request) {
  const raw = request?.url || "";
  const requestUrl = new URL(raw, "https://playbook.local");
  return requestUrl.searchParams.get("url") || "";
}

function rangeFrom(request) {
  const headers = request?.headers;
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get("range");
  return headers.range || headers.Range || null;
}

async function relay(request) {
  const target = targetFrom(request);
  let parsed;
  try { parsed = new URL(target); }
  catch { return { status: 400, body: "invalid url", headers: { "content-type": "text/plain" } }; }
  if (parsed.protocol !== "https:" || parsed.hostname !== "video.twimg.com") {
    return { status: 400, body: "invalid url", headers: { "content-type": "text/plain" } };
  }
  const headers = { "User-Agent": "Mozilla/5.0", Referer: "https://x.com/" };
  const range = rangeFrom(request);
  if (range) headers.Range = range;
  let upstream;
  try { upstream = await fetch(parsed.toString(), { headers }); }
  catch { return { status: 502, body: "upstream failed", headers: { "content-type": "text/plain" } }; }
  const out = { "Cache-Control": "public, max-age=300" };
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) out[name] = value;
  }
  return { status: upstream.status, body: upstream.body, headers: out };
}

export default async function handler(request, response) {
  const result = await relay(request);
  if (response && typeof response.writeHead === "function") {
    response.writeHead(result.status, result.headers);
    if (!result.body || typeof result.body === "string") {
      response.end(result.body || "");
      return;
    }
    const reader = result.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      response.write(Buffer.from(value));
    }
    response.end();
    return;
  }
  return new Response(result.body, { status: result.status, headers: result.headers });
}
