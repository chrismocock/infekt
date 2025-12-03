// Story QR Generation Handler
// Generates QR codes and links for social media stories

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processInfection, type InfectionRequest, type RedisClient } from "../_shared/infectionEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter((p) => p);
  const action = pathParts[pathParts.length - 1] || "generate";

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "";
    const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "";
    const hasRedis = redisUrl !== "" && redisToken !== "";

    const redisGet = async (key: string) => {
      if (!hasRedis) return null;
      const response = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
        headers: { "Authorization": `Bearer ${redisToken}` },
      });
      const data = await response.json();
      return data.result;
    };

    const redisSetex = async (key: string, seconds: number, value: string) => {
      if (!hasRedis) return;
      await fetch(`${redisUrl}/setex/${encodeURIComponent(key)}/${seconds}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(value),
      });
    };

    const redisZadd = async (key: string, score: number, member: string) => {
      if (!hasRedis) return;
      await fetch(`${redisUrl}/zadd/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score, member }),
      });
    };

    const redisClient: RedisClient | null = hasRedis ? {
      get: redisGet,
      setex: redisSetex,
      zadd: redisZadd,
    } : null;

    if (action === "generate") {
      return await handleGenerateStory(req, supabaseClient);
    } else if (action === "infect") {
      return await handleStoryInfection(req, supabaseClient, redisClient);
    } else {
      return new Response(
        JSON.stringify({ error: "Unknown action" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Request failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Generate story QR code and link
async function handleGenerateStory(
  req: Request,
  supabaseClient: any
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const body = await req.json();
  const { userId, strainId } = body;

  if (!userId || !strainId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Generate infection link code
  const { data: linkCode } = await supabaseClient.rpc("generate_infection_link_code");
  const code = linkCode || Math.random().toString(36).substring(2, 10).toUpperCase();

  // Create infection link
  const { data: link, error: linkError } = await supabaseClient
    .from("infection_links")
    .insert({
      code,
      infector_id: userId,
      strain_id: strainId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days for stories
      max_uses: null,
      use_count: 0,
    })
    .select("id")
    .single();

  if (linkError) {
    return new Response(
      JSON.stringify({ error: `Failed to create link: ${linkError.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Generate QR code URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`infekt://i/${code}`)}`;
  const deepLink = `infekt://i/${code}`;
  const webLink = `https://infekt.app/i/${code}`;

  return new Response(
    JSON.stringify({
      success: true,
      qrCodeUrl,
      deepLink,
      webLink,
      linkId: code,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Handle story link infection
async function handleStoryInfection(
  req: Request,
  supabaseClient: any,
  redisClient: RedisClient | null
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const body = await req.json();
  const { storyId, infectorId, location } = body;

  if (!storyId || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // storyId is the infection link code
  const { data: link, error: linkError } = await supabaseClient
    .from("infection_links")
    .select("infector_id, strain_id, expires_at, max_uses, use_count")
    .eq("code", storyId)
    .single();

  if (linkError || !link) {
    return new Response(
      JSON.stringify({ error: "Invalid story link" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Story link has expired" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (link.max_uses && link.use_count >= link.max_uses) {
    return new Response(
      JSON.stringify({ error: "Story link has reached max uses" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: strain } = await supabaseClient
    .from("strains")
    .select("origin_user_id")
    .eq("id", link.strain_id)
    .single();

  if (!strain) {
    return new Response(
      JSON.stringify({ error: "Strain not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const infectedId = strain.origin_user_id;
  const actualInfectorId = infectorId || infectedId;

  const infectionRequest: InfectionRequest = {
    infectorId: actualInfectorId,
    infectedId,
    location,
    method: "story_qr",
    metadata: { storyId },
  };

  try {
    const result = await processInfection(
      supabaseClient,
      redisClient,
      infectionRequest
    );

    await supabaseClient
      .from("infection_links")
      .update({ use_count: (link.use_count || 0) + 1 })
      .eq("code", storyId);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

