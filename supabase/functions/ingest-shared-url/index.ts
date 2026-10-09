import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SourcePlatform =
  | "twitter"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "unknown";

interface IngestRequest {
  source_url: string;
  category_id?: string;
  title?: string;
}

interface LinkMetadata {
  title?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
}

function detectPlatform(url: string): SourcePlatform {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (
      host === "twitter.com" ||
      host === "x.com" ||
      host === "mobile.twitter.com" ||
      host === "mobile.x.com"
    ) {
      return "twitter";
    }
    if (host === "instagram.com" || host.endsWith(".instagram.com")) {
      return "instagram";
    }
    if (
      host === "tiktok.com" ||
      host.endsWith(".tiktok.com") ||
      host === "vm.tiktok.com" ||
      host === "vt.tiktok.com"
    ) {
      return "tiktok";
    }
    if (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "fb.watch" ||
      host === "fb.com" ||
      host === "m.facebook.com"
    ) {
      return "facebook";
    }
  } catch {
    // ignore
  }
  return "unknown";
}

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(?:\w+\/)?status(?:es)?\/(\d+)/i);
  return match?.[1] ?? null;
}

function extractTikTokVideoId(url: string): string | null {
  const videoMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
  if (videoMatch?.[1]) return videoMatch[1];
  const embedMatch = url.match(/tiktok\.com\/embed(?:\/v2)?\/(\d+)/i);
  if (embedMatch?.[1]) return embedMatch[1];
  return null;
}

function extractInstagramShortcode(url: string): string | null {
  const match = url.match(
    /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
  );
  return match?.[1] ?? null;
}

function twitterEmbedUrl(tweetId: string): string {
  // Video-focused player — better for full-bleed muted autoplay than the tweet card.
  return `https://twitter.com/i/videos/tweet/${tweetId}`;
}

function tiktokEmbedUrl(videoId: string): string {
  return `https://www.tiktok.com/embed/v2/${videoId}?autoplay=1`;
}

function instagramEmbedUrl(shortcode: string, sourceUrl: string): string {
  const isReel = /instagram\.com\/(?:reel|reels)\//i.test(sourceUrl);
  const kind = isReel ? "reel" : "p";
  return `https://www.instagram.com/${kind}/${shortcode}/embed/`;
}

function facebookEmbedUrl(sourceUrl: string): string {
  const href = encodeURIComponent(sourceUrl);
  return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&autoplay=true&mute=1&width=320&height=560&t=0`;
}

async function fetchTwitterOEmbed(url: string): Promise<Partial<LinkMetadata>> {
  const oembedEndpoint =
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=1&dnt=1&hide_thread=1&hide_media=0`;

  const response = await fetch(oembedEndpoint, {
    headers: { "User-Agent": "Playbook/1.0 (link organizer)" },
  });

  if (!response.ok) return {};

  const payload = await response.json() as {
    author_name?: string;
    html?: string;
  };

  const title = payload.author_name ? `Post by ${payload.author_name}` : undefined;
  return { title };
}

async function fetchTikTokOEmbed(url: string): Promise<Partial<LinkMetadata>> {
  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { headers: { "User-Agent": "Playbook/1.0 (link organizer)" } },
    );
    if (!response.ok) return {};
    const payload = await response.json() as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    const title = payload.author_name
      ? `${payload.title ?? "TikTok"} · @${payload.author_name}`
      : payload.title;
    return {
      title,
      thumbnailUrl: payload.thumbnail_url,
    };
  } catch {
    return {};
  }
}

async function resolveLinkMetadata(
  platform: SourcePlatform,
  url: string,
): Promise<LinkMetadata> {
  if (platform === "twitter") {
    const tweetId = extractTweetId(url);
    if (!tweetId) {
      return { title: "X post" };
    }
    const oembed = await fetchTwitterOEmbed(url);
    return {
      title: oembed.title ?? "X post",
      embedUrl: twitterEmbedUrl(tweetId),
    };
  }

  if (platform === "tiktok") {
    const videoId = extractTikTokVideoId(url);
    const oembed = await fetchTikTokOEmbed(url);
    return {
      title: oembed.title ?? "TikTok video",
      thumbnailUrl: oembed.thumbnailUrl,
      // Short links (vm.tiktok.com) may lack an id until expanded; client can fall back.
      embedUrl: videoId ? tiktokEmbedUrl(videoId) : undefined,
    };
  }

  if (platform === "instagram") {
    const shortcode = extractInstagramShortcode(url);
    return {
      title: "Instagram post",
      embedUrl: shortcode ? instagramEmbedUrl(shortcode, url) : undefined,
    };
  }

  if (platform === "facebook") {
    return {
      title: "Facebook video",
      embedUrl: facebookEmbedUrl(url),
    };
  }

  return { title: "Saved link" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const body = (await req.json()) as IngestRequest;
    if (!body.source_url) {
      return new Response(JSON.stringify({ error: "source_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = new URL(body.source_url).toString();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const platform = detectPlatform(normalizedUrl);
    const metadata = await resolveLinkMetadata(platform, normalizedUrl);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: play, error: insertError } = await admin
      .from("plays")
      .insert({
        user_id: userId,
        category_id: body.category_id ?? null,
        source_url: normalizedUrl,
        source_platform: platform,
        title: body.title ?? metadata.title ?? null,
        thumbnail_url: metadata.thumbnailUrl ?? null,
        embed_url: metadata.embedUrl ?? null,
        video_storage_path: null,
        status: "ready",
        error_message: null,
      })
      .select()
      .single();

    if (insertError || !play) {
      throw insertError ?? new Error("Failed to create play");
    }

    return new Response(JSON.stringify({ play }), {
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
