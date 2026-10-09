/**
 * Resolves an official platform embed URL for in-app WKWebView playback.
 * Does NOT extract CDN media, download, or rehost third-party video.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(?:\w+\/)?status(?:es)?\/(\d+)/i);
  return match?.[1] ?? null;
}

function extractTikTokVideoId(url: string): string | null {
  const videoMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (videoMatch?.[1]) return videoMatch[1];
  const embedMatch = url.match(/tiktok\.com\/embed(?:\/v2)?\/(\d+)/i);
  return embedMatch?.[1] ?? null;
}

function extractInstagramShortcode(url: string): string | null {
  const match = url.match(
    /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  );
  return match?.[1] ?? null;
}

function officialEmbedURL(sourceUrl: string): string | null {
  const tweetId = extractTweetId(sourceUrl);
  if (tweetId) {
    return `https://twitter.com/i/videos/tweet/${tweetId}`;
  }

  const tiktokId = extractTikTokVideoId(sourceUrl);
  if (tiktokId) {
    return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=1`;
  }

  const igCode = extractInstagramShortcode(sourceUrl);
  if (igCode) {
    const isReel = /instagram\.com\/(?:reel|reels)\//i.test(sourceUrl);
    return `https://www.instagram.com/${isReel ? "reel" : "p"}/${igCode}/embed/`;
  }

  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.watch" ||
      host === "fb.com"
    ) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(sourceUrl)}&show_text=false&autoplay=true&mute=1&width=320&height=560&t=0`;
    }
  } catch {
    // ignore
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

    const embedUrl = officialEmbedURL(body.source_url);
    if (!embedUrl) {
      return new Response(JSON.stringify({ error: "No official embed for this URL" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ embed_url: embedUrl }), {
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
