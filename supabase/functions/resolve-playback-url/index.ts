import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i);
  return match?.[1] ?? null;
}

async function twitterStreamURL(sourceUrl: string): Promise<string | null> {
  const tweetId = extractTweetId(sourceUrl);
  if (!tweetId) return null;

  const syndicationUrl =
    `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=0`;

  const response = await fetch(syndicationUrl, {
    headers: { "User-Agent": "Playbook/1.0 (playback resolver)" },
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const mediaDetails: Array<Record<string, unknown>> = payload?.mediaDetails ?? [];

  for (const media of mediaDetails) {
    const type = media.type as string | undefined;
    if (type !== "video" && type !== "animated_gif") continue;

    const variants = (media.video_info as { variants?: Array<Record<string, unknown>> })
      ?.variants ?? [];

    const mp4Variants = variants
      .filter((v) => typeof v.url === "string" && (v.content_type === "video/mp4" || !v.content_type))
      .map((v) => ({
        url: v.url as string,
        bitrate: (v.bitrate as number | undefined) ?? 0,
      }))
      .sort((a, b) => b.bitrate - a.bitrate);

    if (mp4Variants.length > 0) return mp4Variants[0].url;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as { source_url?: string };
    if (!body.source_url) {
      return new Response(JSON.stringify({ error: "source_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const playbackUrl = await twitterStreamURL(body.source_url);
    if (!playbackUrl) {
      return new Response(JSON.stringify({ error: "No stream available for this URL" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ playback_url: playbackUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
