// Chain Reaction Infection Handler
// Burst mode infection triggered when infecting with >10 tags

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
    const { infectorId, infectedId, burstCount, location } = body;

    if (!infectorId || !infectedId || !location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Store active chain reaction in Redis (10 minutes)
    const chainReactionKey = `chain_reaction:${infectorId}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    if (redisClient) {
      await redisClient.setex(
        chainReactionKey,
        600,
        JSON.stringify({ expiresAt, burstCount: burstCount || 1 })
      );
    }

    const infectionRequest: InfectionRequest = {
      infectorId,
      infectedId,
      location,
      method: "chain_reaction",
      metadata: { burstCount: burstCount || 1 },
    };

    try {
      const result = await processInfection(
        supabaseClient,
        redisClient,
        infectionRequest
      );

      // Check for nearby players to also infect (chain reaction effect)
      // This would require a separate endpoint or background job
      // For now, we'll just process the main infection

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
          chainReactionActive: true,
          expiresAt: new Date(expiresAt).toISOString(),
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

