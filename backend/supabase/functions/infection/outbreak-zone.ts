// Outbreak Zone Auto-Infection Handler
// Auto-infects players when they enter active outbreak zones

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

    // Check if player is in any active outbreak zone
    const locationPoint = `POINT(${location.lng} ${location.lat})`;
    const { data: outbreakZones, error: zonesError } = await supabaseClient.rpc(
      "check_outbreak_zone_proximity",
      {
        p_user_location: locationPoint,
        p_radius_meters: 500.0,
      }
    );

    if (zonesError || !outbreakZones || outbreakZones.length === 0) {
      return new Response(
        JSON.stringify({ message: "Not in any active outbreak zone" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use first active outbreak zone
    const zone = outbreakZones[0];

    // Check cooldown per zone (auto-infect every 5 minutes)
    if (redisClient) {
      const cooldownKey = `cooldown:outbreak_zone:${playerId}:${zone.zone_id}`;
      const cooldown = await redisClient.get(cooldownKey);
      if (cooldown) {
        return new Response(
          JSON.stringify({ message: "Outbreak zone infection cooldown active" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Set cooldown (5 minutes)
      await redisClient.setex(cooldownKey, 300, "1");
    }

    // Get infector from zone strain or random high host_score player
    let infectorId: string | null = null;

    if (zone.strain_id) {
      const { data: strain } = await supabaseClient
        .from("strains")
        .select("origin_user_id")
        .eq("id", zone.strain_id)
        .single();

      if (strain) {
        infectorId = strain.origin_user_id;
      }
    }

    // Fallback: get random high host_score player
    if (!infectorId) {
      const { data: highScorePlayers } = await supabaseClient
        .from("users")
        .select("id")
        .gte("host_score", 5.0)
        .not("id", "eq", playerId)
        .not("current_strain_id", "is", null)
        .limit(10);

      if (highScorePlayers && highScorePlayers.length > 0) {
        infectorId = highScorePlayers[Math.floor(Math.random() * highScorePlayers.length)].id;
      }
    }

    if (!infectorId) {
      return new Response(
        JSON.stringify({ error: "No infector available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const infectionRequest: InfectionRequest = {
      infectorId,
      infectedId: playerId,
      location,
      method: "outbreak_zone",
      metadata: { 
        zoneId: zone.zone_id,
        severity: zone.severity,
        strainId: zone.strain_id,
      },
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
          zone: {
            id: zone.zone_id,
            severity: zone.severity,
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

