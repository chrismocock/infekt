// Unified Infection Endpoint Router
// Routes to specific infection method handlers

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
  const method = pathParts[pathParts.length - 1] || "direct";

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

    // Redis client setup
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

    // Route to specific infection method handler
    switch (method) {
      case "direct":
        return await handleDirectInfection(req, supabaseClient, redisClient);
      case "qr":
        return await handleQRInfection(req, supabaseClient, redisClient);
      case "link":
        return await handleDeepLinkInfection(req, supabaseClient, redisClient);
      case "chat":
        return await handleChatLinkInfection(req, supabaseClient, redisClient);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown infection method: ${method}` }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Infection failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Direct Infection Handler
async function handleDirectInfection(
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
  const { infectorId, infectedUsername, tagIds, location, variantId } = body;

  if (!infectorId || !infectedUsername || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Lookup user by username
  const { data: infectedUser, error: userError } = await supabaseClient
    .from("users")
    .select("id")
    .eq("username", infectedUsername)
    .single();

  if (userError || !infectedUser) {
    return new Response(
      JSON.stringify({ error: "User not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const infectionRequest: InfectionRequest = {
    infectorId,
    infectedId: infectedUser.id,
    location,
    method: "direct",
    variantId,
    tagIds: tagIds || [],
    metadata: {},
  };

  try {
    const result = await processInfection(
      supabaseClient,
      redisClient,
      infectionRequest
    );

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

// QR Code Infection Handler
async function handleQRInfection(
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
  const { qrToken, infectorId, location } = body;

  if (!qrToken || !infectorId || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Decode QR token - could be strain ID or infection link code
  let infectedId: string | null = null;

  // Try as infection link code first
  const { data: link } = await supabaseClient
    .from("infection_links")
    .select("infector_id, strain_id, expires_at, max_uses, use_count")
    .eq("code", qrToken)
    .maybeSingle();

  if (link) {
    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "QR code has expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check max uses
    if (link.max_uses && link.use_count >= link.max_uses) {
      return new Response(
        JSON.stringify({ error: "QR code has reached max uses" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get strain owner
    const { data: strain } = await supabaseClient
      .from("strains")
      .select("origin_user_id")
      .eq("id", link.strain_id)
      .single();

    if (strain) {
      infectedId = strain.origin_user_id;
    }

    // Increment use count
    await supabaseClient
      .from("infection_links")
      .update({ use_count: (link.use_count || 0) + 1 })
      .eq("code", qrToken);
  } else {
    // Try as strain ID
    const { data: strain } = await supabaseClient
      .from("strains")
      .select("origin_user_id")
      .eq("id", qrToken)
      .maybeSingle();

    if (strain) {
      infectedId = strain.origin_user_id;
    }
  }

  if (!infectedId) {
    return new Response(
      JSON.stringify({ error: "Invalid QR code" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const infectionRequest: InfectionRequest = {
    infectorId,
    infectedId,
    location,
    method: "qr",
    metadata: { qrToken },
  };

  try {
    const result = await processInfection(
      supabaseClient,
      redisClient,
      infectionRequest
    );

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

// Deep Link Infection Handler
async function handleDeepLinkInfection(
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
  const { linkId, infectorId, location } = body;

  if (!linkId || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Lookup infection link
  const { data: link, error: linkError } = await supabaseClient
    .from("infection_links")
    .select("infector_id, strain_id, expires_at, max_uses, use_count")
    .eq("code", linkId)
    .single();

  if (linkError || !link) {
    return new Response(
      JSON.stringify({ error: "Invalid link" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Validate expiration
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Link has expired" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Validate max uses
  if (link.max_uses && link.use_count >= link.max_uses) {
    return new Response(
      JSON.stringify({ error: "Link has reached max uses" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get strain owner
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

  // Auto-infect if infectorId is null (first-time install)
  const actualInfectorId = infectorId || infectedId;

  const infectionRequest: InfectionRequest = {
    infectorId: actualInfectorId,
    infectedId,
    location,
    method: "deep_link",
    metadata: { linkId },
  };

  try {
    const result = await processInfection(
      supabaseClient,
      redisClient,
      infectionRequest
    );

    // Increment use count
    await supabaseClient
      .from("infection_links")
      .update({ use_count: (link.use_count || 0) + 1 })
      .eq("code", linkId);

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

// Chat Link Infection Handler (WhatsApp, SMS, Messenger)
async function handleChatLinkInfection(
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
  const { linkId, infectorId, location } = body;

  if (!linkId || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Same logic as deep link, but method='chat_link'
  const { data: link, error: linkError } = await supabaseClient
    .from("infection_links")
    .select("infector_id, strain_id, expires_at, max_uses, use_count")
    .eq("code", linkId)
    .single();

  if (linkError || !link) {
    return new Response(
      JSON.stringify({ error: "Invalid link" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Link has expired" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (link.max_uses && link.use_count >= link.max_uses) {
    return new Response(
      JSON.stringify({ error: "Link has reached max uses" }),
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
    method: "chat_link",
    metadata: { linkId },
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
      .eq("code", linkId);

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

