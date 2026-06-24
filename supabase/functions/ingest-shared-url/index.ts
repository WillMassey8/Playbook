import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SourcePlatform = "twitter" | "instagram" | "unknown";

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
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "twitter.com" || host === "x.com" || host === "mobile.twitter.com") {
      return "twitter";
    }
    if (host === "instagram.com" || host === "www.instagram.com") {
      return "instagram";
    }
  } catch {
    // ignore
  }
  return "unknown";
}

function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i);
  return match?.[1] ?? null;
}

function twitterEmbedUrl(tweetId: string): string {
  return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&dnt=true`;
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
      title: oembed.title,
      embedUrl: twitterEmbedUrl(tweetId),
    };
  }

  if (platform === "instagram") {
    return {
      title: "Instagram post",
      // No embed URL — playback opens in Instagram (platform policy).
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
