// Mutant Tag Infection Handler
// Tag-specific power infections based on mutation unlocks

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
    const { infectorId, infectedId, tagId, location } = body;

    if (!infectorId || !infectedId || !location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get infector's mutation unlocks
    const { data: mutations, error: mutationsError } = await supabaseClient
      .from("user_mutation_unlocks")
      .select(`
        node_id,
        mutation_tree_nodes!inner(
          id,
          name,
          branch,
          boost
        )
      `)
      .eq("user_id", infectorId);

    if (mutationsError) {
      return new Response(
        JSON.stringify({ error: "Failed to get mutations" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for mutant tag powers
    const mutationEffects: Record<string, any> = {};
    let doubleInfection = false;
    let skipDistance = false;
    let increasedMultiplier = 1.0;

    if (mutations && mutations.length > 0) {
      for (const mutation of mutations) {
        const boost = mutation.mutation_tree_nodes?.boost || {};
        
        // Check for double infection power
        if (boost.double_infection || boost.viral_explosion) {
          doubleInfection = true;
        }

        // Check for skip distance power
        if (boost.skip_distance || boost.ghost_tagging) {
          skipDistance = true;
        }

        // Accumulate multipliers
        if (boost.spread_multiplier) {
          increasedMultiplier *= boost.spread_multiplier;
        }
        if (boost.indirect_bonus) {
          increasedMultiplier *= boost.indirect_bonus;
        }

        // Store all effects
        Object.assign(mutationEffects, boost);
      }
    }

    // If no special mutations, this is a regular infection
    if (!doubleInfection && !skipDistance && increasedMultiplier === 1.0) {
      return new Response(
        JSON.stringify({ error: "No mutant tag powers active" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process infection(s)
    const results = [];
    const infectionRequest: InfectionRequest = {
      infectorId,
      infectedId,
      location,
      method: "mutant_tag",
      metadata: {
        tagId,
        mutationEffects,
        doubleInfection,
        skipDistance,
        increasedMultiplier,
      },
    };

    try {
      const result = await processInfection(
        supabaseClient,
        redisClient,
        infectionRequest
      );

      results.push(result);

      // If double infection, infect a second random nearby player
      if (doubleInfection) {
        const { data: nearbyUsers } = await supabaseClient
          .from("users")
          .select("id")
          .not("id", "eq", infectorId)
          .not("id", "eq", infectedId)
          .limit(10);

        if (nearbyUsers && nearbyUsers.length > 0) {
          const secondTarget = nearbyUsers[Math.floor(Math.random() * nearbyUsers.length)];

          const secondInfectionRequest: InfectionRequest = {
            infectorId,
            infectedId: secondTarget.id,
            location,
            method: "mutant_tag",
            metadata: {
              tagId,
              mutationEffects,
              doubleInfection: true,
              skipDistance,
              increasedMultiplier,
              isSecondInfection: true,
            },
          };

          try {
            const secondResult = await processInfection(
              supabaseClient,
              redisClient,
              secondInfectionRequest
            );
            results.push(secondResult);
          } catch (error: any) {
            // Ignore errors for second infection
            console.error("Second infection failed:", error);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          infections: results.length,
          results,
          mutationEffects: {
            doubleInfection,
            skipDistance,
            increasedMultiplier,
            effects: mutationEffects,
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

