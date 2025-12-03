// Ambient/Passive Infection Handler
// Server-initiated low-rate random infections for high host_score players

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

    // Check cooldown (prevent spam)
    if (redisClient) {
      const cooldownKey = `cooldown:ambient:${playerId}`;
      const cooldown = await redisClient.get(cooldownKey);
      if (cooldown) {
        return new Response(
          JSON.stringify({ message: "Ambient infection cooldown active" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Set cooldown (1 hour)
      await redisClient.setex(cooldownKey, 3600, "1");
    }

    // Get player's host_score
    const { data: player, error: playerError } = await supabaseClient
      .from("users")
      .select("host_score, current_strain_id, last_location")
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      return new Response(
        JSON.stringify({ error: "Player not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only infect players with high host_score (threshold: 10.0)
    const hostScoreThreshold = 10.0;
    if ((player.host_score || 0) < hostScoreThreshold) {
      return new Response(
        JSON.stringify({ message: "Host score too low for ambient infection" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Random chance (1% base, increases with host_score)
    const baseChance = 0.01;
    const hostScoreMultiplier = Math.min((player.host_score || 0) / 100, 0.1); // Max 10% chance
    const infectionChance = baseChance + hostScoreMultiplier;

    if (Math.random() > infectionChance) {
      return new Response(
        JSON.stringify({ message: "No ambient infection triggered (random chance)" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Select random high host_score player as infector
    const { data: potentialInfectors } = await supabaseClient
      .from("users")
      .select("id, current_strain_id, host_score")
      .not("id", "eq", playerId)
      .gte("host_score", hostScoreThreshold)
      .not("current_strain_id", "is", null)
      .order("host_score", { ascending: false })
      .limit(100);

    if (!potentialInfectors || potentialInfectors.length === 0) {
      return new Response(
        JSON.stringify({ message: "No suitable infectors available" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Random selection weighted by host_score
    const totalScore = potentialInfectors.reduce((sum, p) => sum + (p.host_score || 0), 0);
    let random = Math.random() * totalScore;
    let selectedInfector = potentialInfectors[0];

    for (const infector of potentialInfectors) {
      random -= (infector.host_score || 0);
      if (random <= 0) {
        selectedInfector = infector;
        break;
      }
    }

    // Use player's last location or provided location
    const infectionLocation = player.last_location 
      ? { lat: 0, lng: 0 } // Would extract from geography, simplified
      : location;

    const infectionRequest: InfectionRequest = {
      infectorId: selectedInfector.id,
      infectedId: playerId,
      location: infectionLocation,
      method: "ambient",
      metadata: { 
        hostScore: player.host_score,
        infectorHostScore: selectedInfector.host_score,
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
          message: "Ambient infection triggered",
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

