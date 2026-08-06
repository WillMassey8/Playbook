// Vercel Edge Function — relays an X video file so the browser can play it.
// X's CDN refuses `<video>` playback from other origins, so the stream is
// served through this origin instead.
//
// We buffer the upstream bytes and return them with an explicit Content-Length.
// WKWebView / AVFoundation (the iOS video engine) will NOT play an mp4 response
// that lacks Content-Length, and a streamed/chunked passthrough drops it — which
// is why relayed clips wouldn't play in the app. Buffering keeps it well-formed.
export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const target = new URL(req.url).searchParams.get("url");
  if (!target || !/^https:\/\/video\.twimg\.com\//.test(target)) {
    return new Response("invalid url", { status: 400 });
  }

  const range = req.headers.get("range");
  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://x.com/",
        ...(range ? { Range: range } : {}),
      },
    });

    const body = await upstream.arrayBuffer();

    const headers = new Headers();
    headers.set("content-type", upstream.headers.get("content-type") || "video/mp4");
    headers.set("content-length", String(body.byteLength));
    headers.set("accept-ranges", "bytes");
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) headers.set("content-range", contentRange);
    headers.set("cache-control", "public, max-age=86400");
    headers.set("access-control-allow-origin", "*");

    return new Response(body, { status: upstream.status, headers });
  } catch {
    return new Response("upstream failed", { status: 502 });
  }
}
