// Event Infection Handler
// Handles event-based infection modes: mass_infection, chained, drop_based

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
    const { eventId, playerId, mode, location } = body;

    if (!eventId || !playerId || !mode || !location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get event details (if events table exists, otherwise use metadata)
    // For now, we'll handle events via metadata or create simple event structure
    const eventMode = mode as "mass_infection" | "chained" | "drop_based";

    switch (eventMode) {
      case "mass_infection":
        return await handleMassInfection(req, supabaseClient, redisClient, eventId, playerId, location);
      case "chained":
        return await handleChainedInfection(req, supabaseClient, redisClient, eventId, playerId, location);
      case "drop_based":
        return await handleDropBasedInfection(req, supabaseClient, redisClient, eventId, playerId, location);
      default:
        return new Response(
          JSON.stringify({ error: `Unknown event mode: ${mode}` }),
          {
            status: 400,
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

// Mass Infection Mode: Infect all players in event zone
async function handleMassInfection(
  req: Request,
  supabaseClient: any,
  redisClient: RedisClient | null,
  eventId: string,
  playerId: string,
  location: { lat: number; lng: number }
): Promise<Response> {
  // Get event zone (would come from events table, for now use metadata)
  const body = await req.json();
  const { eventRadius = 500 } = body; // Default 500m radius

  const locationPoint = `POINT(${location.lng} ${location.lat})`;

  // Find all players within event radius
  const { data: nearbyUsers, error: usersError } = await supabaseClient
    .from("users")
    .select("id, last_location")
    .not("id", "eq", playerId)
    .not("last_location", "is", null);

  if (usersError) {
    return new Response(
      JSON.stringify({ error: "Failed to find nearby players" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Filter by distance (simplified - in production use PostGIS)
  const playersInZone: string[] = [];
  for (const user of nearbyUsers || []) {
    if (user.last_location) {
      // In production, use ST_DWithin for accurate distance
      playersInZone.push(user.id);
    }
  }

  // Get infector's strain
  const { data: infector } = await supabaseClient
    .from("users")
    .select("current_strain_id")
    .eq("id", playerId)
    .single();

  if (!infector || !infector.current_strain_id) {
    return new Response(
      JSON.stringify({ error: "Infector strain not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Batch infections
  const results = [];
  const errors = [];

  for (const infectedId of playersInZone.slice(0, 50)) { // Limit to 50 per batch
    try {
      const infectionRequest: InfectionRequest = {
        infectorId: playerId,
        infectedId,
        location,
        method: "event",
        metadata: { eventId, mode: "mass_infection" },
      };

      const result = await processInfection(
        supabaseClient,
        redisClient,
        infectionRequest
      );

      results.push({
        userId: infectedId,
        success: true,
        ...result,
      });
    } catch (error: any) {
      errors.push({
        userId: infectedId,
        error: error.message,
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      mode: "mass_infection",
      infected: results.length,
      failed: errors.length,
      results,
      errors,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Chained Infection Mode: Chain reaction within event
async function handleChainedInfection(
  req: Request,
  supabaseClient: any,
  redisClient: RedisClient | null,
  eventId: string,
  playerId: string,
  location: { lat: number; lng: number }
): Promise<Response> {
  // Get a random nearby player to infect
  const { data: nearbyUsers } = await supabaseClient
    .from("users")
    .select("id")
    .not("id", "eq", playerId)
    .limit(10);

  if (!nearbyUsers || nearbyUsers.length === 0) {
    return new Response(
      JSON.stringify({ error: "No nearby players for chain infection" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const randomUser = nearbyUsers[Math.floor(Math.random() * nearbyUsers.length)];

  try {
    const infectionRequest: InfectionRequest = {
      infectorId: playerId,
      infectedId: randomUser.id,
      location,
      method: "chain_reaction", // Use chain_reaction for chained events
      metadata: { eventId, mode: "chained" },
    };

    const result = await processInfection(
      supabaseClient,
      redisClient,
      infectionRequest
    );

    return new Response(
      JSON.stringify({
        success: true,
        mode: "chained",
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

// Drop Based Mode: Create multiple tag drops in event area
async function handleDropBasedInfection(
  req: Request,
  supabaseClient: any,
  redisClient: RedisClient | null,
  eventId: string,
  playerId: string,
  location: { lat: number; lng: number }
): Promise<Response> {
  const body = await req.json();
  const { dropCount = 5, tagIds = [] } = body;

  // Get infector's tags
  const { data: userTags } = await supabaseClient
    .from("user_tags")
    .select("tag_id")
    .eq("user_id", playerId)
    .limit(10);

  const availableTagIds = tagIds.length > 0 
    ? tagIds 
    : (userTags || []).map((ut: any) => ut.tag_id).slice(0, dropCount);

  if (availableTagIds.length === 0) {
    return new Response(
      JSON.stringify({ error: "No tags available to drop" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Create multiple tag drops in event area
  const drops = [];
  const locationPoint = `POINT(${location.lng} ${location.lat})`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Distribute drops around event location (simplified - random offset)
  for (let i = 0; i < Math.min(dropCount, availableTagIds.length); i++) {
    const offsetLat = (Math.random() - 0.5) * 0.01; // ~500m offset
    const offsetLng = (Math.random() - 0.5) * 0.01;
    const dropLocation = `POINT(${location.lng + offsetLng} ${location.lat + offsetLat})`;

    const { data: drop, error: dropError } = await supabaseClient
      .from("tag_drops")
      .insert({
        creator_id: playerId,
        tag_ids: [availableTagIds[i]],
        location: dropLocation,
        expires_at: expiresAt.toISOString(),
        claimed_by: [],
      })
      .select()
      .single();

    if (!dropError && drop) {
      drops.push(drop);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      mode: "drop_based",
      dropsCreated: drops.length,
      drops,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

