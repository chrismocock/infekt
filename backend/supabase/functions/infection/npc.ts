// NPC Infection Events Handler
// AI strain infections to create activity in zones

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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter((p) => p);
    const action = pathParts[pathParts.length - 1] || "trigger";

    if (action === "trigger") {
      return await handleNPCInfection(req, supabaseClient, redisClient);
    } else if (action === "create-strain") {
      return await handleCreateNPCStrain(req, supabaseClient);
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

// Trigger NPC infection in a zone
async function handleNPCInfection(
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
  const { zoneId, strainId, location, automated } = body;

  if (!location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get or create NPC strain
  let npcStrainId = strainId;
  let npcUserId: string | null = null;

  if (!npcStrainId) {
    // Get or create system/NPC user
    const { data: npcUser } = await supabaseClient
      .from("users")
      .select("id, current_strain_id")
      .eq("username", "NPC_SYSTEM")
      .maybeSingle();

    if (!npcUser) {
      // Create NPC user
      const { data: newNPCUser, error: userError } = await supabaseClient
        .from("users")
        .insert({
          username: "NPC_SYSTEM",
          current_strain_id: null,
        })
        .select("id")
        .single();

      if (userError) {
        return new Response(
          JSON.stringify({ error: `Failed to create NPC user: ${userError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      npcUserId = newNPCUser.id;
    } else {
      npcUserId = npcUser.id;
      npcStrainId = npcUser.current_strain_id;
    }

    // Create NPC strain if needed
    if (!npcStrainId && npcUserId) {
      const { data: newStrain, error: strainError } = await supabaseClient
        .from("strains")
        .insert({
          origin_user_id: npcUserId,
        })
        .select("id")
        .single();

      if (strainError) {
        return new Response(
          JSON.stringify({ error: `Failed to create NPC strain: ${strainError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      npcStrainId = newStrain.id;

      // Update NPC user
      await supabaseClient
        .from("users")
        .update({ current_strain_id: npcStrainId })
        .eq("id", npcUserId);
    }
  }

  if (!npcStrainId) {
    return new Response(
      JSON.stringify({ error: "Failed to get NPC strain" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get NPC user from strain
  if (!npcUserId) {
    const { data: strain } = await supabaseClient
      .from("strains")
      .select("origin_user_id")
      .eq("id", npcStrainId)
      .single();

    if (strain) {
      npcUserId = strain.origin_user_id;
    }
  }

  if (!npcUserId) {
    return new Response(
      JSON.stringify({ error: "NPC user not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Find players in zone to infect
  const locationPoint = `POINT(${location.lng} ${location.lat})`;
  const { data: nearbyUsers } = await supabaseClient
    .from("users")
    .select("id, last_location")
    .not("id", "eq", npcUserId)
    .not("last_location", "is", null)
    .limit(20); // Limit NPC infections per trigger

  if (!nearbyUsers || nearbyUsers.length === 0) {
    return new Response(
      JSON.stringify({ message: "No players in zone to infect" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Infect random players in zone
  const infectionCount = Math.min(3, nearbyUsers.length); // Infect 1-3 players
  const selectedUsers = nearbyUsers
    .sort(() => Math.random() - 0.5)
    .slice(0, infectionCount);

  const results = [];
  const errors = [];

  for (const targetUser of selectedUsers) {
    try {
      const infectionRequest: InfectionRequest = {
        infectorId: npcUserId,
        infectedId: targetUser.id,
        location,
        method: "npc",
        metadata: {
          zoneId,
          strainId: npcStrainId,
          automated: automated !== false,
        },
      };

      const result = await processInfection(
        supabaseClient,
        redisClient,
        infectionRequest
      );

      results.push({
        userId: targetUser.id,
        success: true,
        ...result,
      });
    } catch (error: any) {
      errors.push({
        userId: targetUser.id,
        error: error.message,
      });
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      infected: results.length,
      failed: errors.length,
      results,
      errors,
      npcStrainId,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Create NPC strain (admin function)
async function handleCreateNPCStrain(
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
  const { username = "NPC_SYSTEM" } = body;

  // Get or create NPC user
  const { data: npcUser } = await supabaseClient
    .from("users")
    .select("id, current_strain_id")
    .eq("username", username)
    .maybeSingle();

  let userId: string;
  if (npcUser) {
    userId = npcUser.id;
  } else {
    const { data: newUser, error: userError } = await supabaseClient
      .from("users")
      .insert({
        username,
      })
      .select("id")
      .single();

    if (userError) {
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${userError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    userId = newUser.id;
  }

  // Create strain
  const { data: strain, error: strainError } = await supabaseClient
    .from("strains")
    .insert({
      origin_user_id: userId,
    })
    .select()
    .single();

  if (strainError) {
    return new Response(
      JSON.stringify({ error: `Failed to create strain: ${strainError.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Update user
  await supabaseClient
    .from("users")
    .update({ current_strain_id: strain.id })
    .eq("id", userId);

  return new Response(
    JSON.stringify({
      success: true,
      userId,
      strainId: strain.id,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

