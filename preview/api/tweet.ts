// Vercel Edge Function — resolves an X (Twitter) post's public syndication JSON
// server-side so the client can extract a playable mp4. This mirrors the Vite
// dev-only proxy (`/tw-syndication`) so imported/seeded X clips also play in
// production. Only public post metadata is fetched; nothing is stored.
export const config = { runtime: "edge" };

// Token the public syndication endpoint expects, derived from the post id
// (same algorithm used by X's own embed script / react-tweet).
function getToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return new Response(JSON.stringify({ error: "invalid id" }), {
      status: 400, headers: { "content-type": "application/json" },
    });
  }

  const upstreamUrl =
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${getToken(id)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
        // Cache resolved metadata at the edge — the mp4 URLs are stable enough.
        "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "upstream failed" }), {
      status: 502, headers: { "content-type": "application/json" },
    });
  }
}
