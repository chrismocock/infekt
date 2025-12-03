// Proximity Infection Handler (BLE)
// Handles Bluetooth Low Energy proximity infections

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
    const { infectorId, infectedId, signalStrength, location } = body;

    if (!infectorId || !infectedId || !location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate signal strength threshold (-80 dBm is typical threshold)
    const signalThreshold = -80;
    const actualSignalStrength = signalStrength || -100;

    if (actualSignalStrength < signalThreshold) {
      return new Response(
        JSON.stringify({ error: "Signal strength too weak for proximity infection" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check cooldown per user pair (prevent spam)
    if (redisClient) {
      const cooldownKey = `cooldown:proximity:${infectorId}:${infectedId}`;
      const cooldown = await redisClient.get(cooldownKey);
      if (cooldown) {
        return new Response(
          JSON.stringify({ error: "Proximity infection cooldown active" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Set cooldown (1 minute for proximity)
      await redisClient.setex(cooldownKey, 60, "1");
    }

    const infectionRequest: InfectionRequest = {
      infectorId,
      infectedId,
      location,
      method: "proximity",
      metadata: { signalStrength: actualSignalStrength },
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

