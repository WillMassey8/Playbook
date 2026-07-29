// Vercel Edge Function — relays an X video file so the browser can play it.
// X's CDN refuses `<video>` playback from other origins, so the stream is
// served through this origin instead. Range headers are forwarded so seeking
// keeps working; nothing is stored.
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

    const headers = new Headers();
    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set("cache-control", "public, max-age=3600");
    headers.set("access-control-allow-origin", "*");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("upstream failed", { status: 502 });
  }
}
