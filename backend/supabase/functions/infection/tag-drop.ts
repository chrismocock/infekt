// Tag Drop Infection Handler
// Handles creating and claiming location-based tag drops

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

  // Get action from body or path
  let action = "create";
  let requestBody: any = null;
  let parseError: any = null;
  
  // Try to get action from request body first (for POST requests)
  if (req.method === "POST") {
    try {
      requestBody = await req.json();
      if (requestBody && requestBody.action) {
        action = requestBody.action;
      }
    } catch (e) {
      parseError = e;
      console.error("Failed to parse request body:", e);
      // If body parsing fails, try path-based routing
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter((p) => p);
      action = pathParts[pathParts.length - 1] || "create";
      // requestBody remains null if parsing failed
    }
  } else {
    // For non-POST, use path-based routing
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter((p) => p);
    action = pathParts[pathParts.length - 1] || "create";
  }
  
  console.log("Tag drop function called:", {
    action,
    method: req.method,
    hasRequestBody: !!requestBody,
    parseError: parseError?.message,
  });

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

    // Validate request body for POST requests
    if (req.method === "POST" && !requestBody) {
      console.error("Request body validation failed:", {
        parseError: parseError?.message,
        url: req.url,
      });
      return new Response(
        JSON.stringify({ 
          error: "Invalid or missing request body",
          details: parseError ? `Parse error: ${parseError.message}` : "No body provided"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "create") {
      return await handleCreateDrop(req, supabaseClient, requestBody);
    } else if (action === "claim") {
      return await handleClaimDrop(req, supabaseClient, redisClient, requestBody);
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

// Create a tag drop
async function handleCreateDrop(
  req: Request,
  supabaseClient: any,
  bodyOverride?: any
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

  // Body should already be parsed in main handler
  if (!bodyOverride) {
    return new Response(
      JSON.stringify({ error: "Request body is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const body = bodyOverride;
  const { creatorId, tagIds, location, expiresAt } = body;

  console.log("Create drop request:", {
    creatorId,
    tagIdsCount: tagIds?.length,
    location,
    locationType: typeof location,
    locationKeys: location ? Object.keys(location) : null,
    hasExpiresAt: !!expiresAt,
  });

  // Check for missing required fields
  if (!creatorId) {
    return new Response(
      JSON.stringify({ 
        error: "Missing required field: creatorId",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
    return new Response(
      JSON.stringify({ 
        error: "Missing or invalid tagIds. Must be a non-empty array.",
        received: tagIds,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!location) {
    return new Response(
      JSON.stringify({ 
        error: "Missing required field: location",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Validate location format
  if (typeof location !== 'object' || location === null) {
    return new Response(
      JSON.stringify({ 
        error: "Invalid location format. Expected an object with lat and lng properties.",
        received: location,
        receivedType: typeof location,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    console.error("Invalid location format:", {
      location,
      lat: location.lat,
      latType: typeof location.lat,
      lng: location.lng,
      lngType: typeof location.lng,
    });
    return new Response(
      JSON.stringify({ 
        error: "Invalid location format. Expected { lat: number, lng: number }",
        received: location,
        lat: location.lat,
        latType: typeof location.lat,
        lng: location.lng,
        lngType: typeof location.lng,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Format location for PostGIS GEOGRAPHY type
  // Note: PostGIS expects POINT(longitude latitude) format
  const locationPoint = `POINT(${location.lng} ${location.lat})`;
  const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

  console.log("Inserting tag drop:", {
    creatorId,
    tagIdsCount: tagIds.length,
    locationPoint,
    expiresAt: expires.toISOString(),
  });

  try {
    const { data: drop, error: dropError } = await supabaseClient
      .from("tag_drops")
      .insert({
        creator_id: creatorId,
        tag_ids: tagIds,
        location: locationPoint,
        expires_at: expires.toISOString(),
        claimed_by: [],
      })
      .select()
      .single();

    if (dropError) {
      console.error("Database error creating drop:", {
        message: dropError.message,
        details: dropError.details,
        hint: dropError.hint,
        code: dropError.code,
      });
      return new Response(
        JSON.stringify({ 
          error: `Failed to create drop: ${dropError.message}`,
          details: dropError.details,
          hint: dropError.hint,
          code: dropError.code,
        }),
        {
          status: dropError.code === '23503' ? 400 : 500, // Foreign key violation = 400, other DB errors = 500
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!drop) {
      console.error("No data returned from insert");
      return new Response(
        JSON.stringify({ error: "Failed to create drop: No data returned" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        drop,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Unexpected error in handleCreateDrop:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unexpected error creating drop",
        details: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Claim a tag drop
async function handleClaimDrop(
  req: Request,
  supabaseClient: any,
  redisClient: RedisClient | null,
  bodyOverride?: any
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

  // Body should already be parsed in main handler
  if (!bodyOverride) {
    return new Response(
      JSON.stringify({ error: "Request body is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const body = bodyOverride;
  const { dropId, playerId, location } = body;

  if (!dropId || !playerId || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get drop
  const { data: drop, error: dropError } = await supabaseClient
    .from("tag_drops")
    .select("*")
    .eq("id", dropId)
    .single();

  if (dropError || !drop) {
    return new Response(
      JSON.stringify({ error: "Tag drop not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check expiration
  if (new Date(drop.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Tag drop has expired" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check if already claimed
  const claimedBy = (drop.claimed_by as string[]) || [];
  if (claimedBy.includes(playerId)) {
    return new Response(
      JSON.stringify({ error: "Tag drop already claimed by you" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get creator
  const { data: creator } = await supabaseClient
    .from("users")
    .select("id, current_strain_id")
    .eq("id", drop.creator_id)
    .single();

  if (!creator) {
    return new Response(
      JSON.stringify({ error: "Drop creator not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Process infection
  const tagIds = (drop.tag_ids as string[]) || [];
  const infectionRequest: InfectionRequest = {
    infectorId: creator.id,
    infectedId: playerId,
    location,
    method: "tag_drop",
    tagIds: tagIds.length > 0 ? tagIds : undefined,
    metadata: { dropId },
  };

  try {
    const result = await processInfection(
      supabaseClient,
      redisClient,
      infectionRequest
    );

    // Mark as claimed
    const updatedClaimedBy = [...claimedBy, playerId];
    await supabaseClient
      .from("tag_drops")
      .update({ claimed_by: updatedClaimedBy })
      .eq("id", dropId);

    // Remove drop if all tags claimed (optional - could keep for multiple claims)
    // For now, we'll keep it but mark as claimed

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

