// Group Infection Handler
// Handles group creation, membership, and batch infections

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
  const action = pathParts[pathParts.length - 1] || "infect";

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

    if (action === "infect") {
      return await handleGroupInfection(req, supabaseClient, redisClient);
    } else if (action === "create") {
      return await handleCreateGroup(req, supabaseClient);
    } else if (action === "join") {
      return await handleJoinGroup(req, supabaseClient);
    } else if (action === "members") {
      return await handleGetMembers(req, supabaseClient);
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

// Infect all group members
async function handleGroupInfection(
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
  const { groupId, infectorId, tagIds, location } = body;

  if (!groupId || !infectorId || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get all group members
  const { data: members, error: membersError } = await supabaseClient
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (membersError) {
    return new Response(
      JSON.stringify({ error: "Failed to get group members" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!members || members.length === 0) {
    return new Response(
      JSON.stringify({ error: "Group has no members" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Batch infections
  const results = [];
  const errors = [];

  for (const member of members) {
    if (member.user_id === infectorId) {
      continue; // Skip self
    }

    try {
      const infectionRequest: InfectionRequest = {
        infectorId,
        infectedId: member.user_id,
        location,
        method: "group_infection",
        tagIds: tagIds || [],
        metadata: { groupId },
      };

      const result = await processInfection(
        supabaseClient,
        redisClient,
        infectionRequest
      );

      results.push({
        userId: member.user_id,
        success: true,
        ...result,
      });
    } catch (error: any) {
      errors.push({
        userId: member.user_id,
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
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Create a group
async function handleCreateGroup(
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
  const { name, creatorId, description } = body;

  if (!name || !creatorId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: group, error: groupError } = await supabaseClient
    .from("groups")
    .insert({
      name,
      creator_id: creatorId,
      description: description || null,
      member_count: 1,
    })
    .select()
    .single();

  if (groupError) {
    return new Response(
      JSON.stringify({ error: `Failed to create group: ${groupError.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Add creator as owner
  await supabaseClient
    .from("group_members")
    .insert({
      group_id: group.id,
      user_id: creatorId,
      role: "owner",
    });

  return new Response(
    JSON.stringify({
      success: true,
      group,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Join a group
async function handleJoinGroup(
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
  const { groupId, userId } = body;

  if (!groupId || !userId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check if already a member
  const { data: existing } = await supabaseClient
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ error: "Already a member of this group" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { error: joinError } = await supabaseClient
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: userId,
      role: "member",
    });

  if (joinError) {
    return new Response(
      JSON.stringify({ error: `Failed to join group: ${joinError.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Joined group successfully",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Get group members
async function handleGetMembers(
  req: Request,
  supabaseClient: any
): Promise<Response> {
  const url = new URL(req.url);
  const groupId = url.searchParams.get("groupId") || url.searchParams.get("id");

  if (!groupId) {
    return new Response(
      JSON.stringify({ error: "Group ID required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: members, error: membersError } = await supabaseClient
    .from("group_members")
    .select(`
      user_id,
      role,
      joined_at,
      user:user_id (
        id,
        username
      )
    `)
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (membersError) {
    return new Response(
      JSON.stringify({ error: "Failed to get members" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      group_id: groupId,
      members: members || [],
      count: (members || []).length,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

