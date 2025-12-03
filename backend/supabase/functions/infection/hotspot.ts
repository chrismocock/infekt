// Hotspot Infection Handler
// Auto-infects players when they enter hotspot zones

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
    const { playerId, location } = body;

    if (!playerId || !location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if player is in any hotspot
    const locationPoint = `POINT(${location.lng} ${location.lat})`;
    const { data: hotspots, error: hotspotsError } = await supabaseClient.rpc(
      "check_hotspot_proximity",
      {
        p_user_location: locationPoint,
        p_radius_meters: 100.0,
      }
    );

    if (hotspotsError || !hotspots || hotspots.length === 0) {
      return new Response(
        JSON.stringify({ error: "Not in any hotspot zone" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use first active hotspot
    const hotspot = hotspots[0];

    // Random chance based on tag_boost_rate
    const boostRate = hotspot.tag_boost_rate || 0.1;
    if (Math.random() > boostRate) {
      return new Response(
        JSON.stringify({ message: "No infection triggered (random chance)" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get a random player in the hotspot to infect from (or use hotspot creator)
    // For now, we'll use a system strain or the first player in hotspot
    // In production, you might want to track active players in hotspots
    const { data: systemStrain } = await supabaseClient
      .from("strains")
      .select("origin_user_id")
      .limit(1)
      .single();

    if (!systemStrain) {
      return new Response(
        JSON.stringify({ error: "No infector available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const infectorId = systemStrain.origin_user_id;

    // Check cooldown
    if (redisClient) {
      const cooldownKey = `cooldown:hotspot:${playerId}:${hotspot.hotspot_id}`;
      const cooldown = await redisClient.get(cooldownKey);
      if (cooldown) {
        return new Response(
          JSON.stringify({ message: "Hotspot infection cooldown active" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Set cooldown (5 minutes)
      await redisClient.setex(cooldownKey, 300, "1");
    }

    const infectionRequest: InfectionRequest = {
      infectorId,
      infectedId: playerId,
      location,
      method: "hotspot",
      metadata: { hotspotId: hotspot.hotspot_id },
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
          hotspot: {
            id: hotspot.hotspot_id,
            name: hotspot.name,
            xp_multiplier: hotspot.xp_multiplier,
          },
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

