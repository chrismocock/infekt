import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processInfection, type InfectionRequest, type RedisClient } from "../_shared/infectionEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TagRequest {
  tagger_id: string;
  target_id: string;
  location: { lat: number; lng: number };
  variant_id?: string;
}

// VariantRules interface moved to infectionEngine.ts

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const normalizedPath = url.pathname.replace(/\/+$/, "");

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

    // Route GET requests for tag metadata
    if (
      normalizedPath.endsWith("/user/tags") ||
      normalizedPath.endsWith("/tag/lineage")
    ) {
      if (normalizedPath.endsWith("/user/tags")) {
        return await handleUserTagsRequest(req, supabaseClient, url);
      }
      return await handleTagLineageRequest(req, supabaseClient, url);
    }

    // Upstash Redis REST API client
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

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Unsupported method" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { tagger_id, target_id, location, variant_id }: TagRequest =
      await req.json();

    // Validation
    if (!tagger_id || !target_id || !location) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use unified infection engine
    const redisClient: RedisClient | null = hasRedis ? {
      get: redisGet,
      setex: redisSetex,
      zadd: redisZadd,
    } : null;

    try {
      const infectionRequest: InfectionRequest = {
        infectorId: tagger_id,
        infectedId: target_id,
        location,
        method: "direct",
        variantId: variant_id,
        metadata: {},
      };

      const result = await processInfection(
        supabaseClient,
        redisClient,
        infectionRequest
      );

      // Get the created tag for backward compatibility
      const { data: newTag } = await supabaseClient
        .from("tags")
        .select("*")
        .eq("infection_event_id", result.infectionEventId)
        .limit(1)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          tag: newTag,
          message: "Tag created successfully",
          unlocked_variants: result.unlockedVariants || [],
          multipliers: result.multipliers,
          mp_awarded: result.mpAwarded || 0,
          outbreak_triggered: result.outbreakTriggered || false,
          propagation: result.propagation,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Infection failed" }),
        {
          status: error.message?.includes("cooldown") ? 429 : 
                  error.message?.includes("not found") ? 404 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper functions moved to infectionEngine.ts

type ScoreSummaryEntry = {
  origin_user_id: string;
  username: string | null;
  direct_increment: number;
  indirect_increment: number;
  totals: {
    direct_score: number;
    indirect_score: number;
  };
};

type PropagationResult = {
  transmitted: number;
  final_tag_count: number;
  new_tags: Array<{
    tag_id: string;
    origin_user_id: string;
    origin_username: string | null;
    generation_depth: number;
  }>;
  score_summary: ScoreSummaryEntry[];
};

// Helper functions moved to infectionEngine.ts

async function handleUserTagsRequest(
  req: Request,
  supabaseClient: any,
  url: URL
): Promise<Response> {
  let userId = url.searchParams.get("user_id") || "";

  if (!userId && req.method !== "GET") {
    try {
      const body = await req.json();
      userId = body?.user_id || "";
    } catch {
      userId = "";
    }
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "user_id is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data, error } = await supabaseClient
    .from("user_tags")
    .select(`
      tag_id,
      acquired_at,
      generation_depth,
      origin_user_id,
      tag:tag_id (
        id,
        description,
        origin_user_id,
        created_at,
        generation
      ),
      origin:origin_user_id (
        id,
        username
      )
    `)
    .eq("user_id", userId)
    .order("acquired_at", { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch tags: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const tags = (data || []).map((row: any) => ({
    tag_id: row.tag_id,
    acquired_at: row.acquired_at,
    generation_depth: row.generation_depth,
    origin_user_id: row.origin_user_id,
    origin_user: row.origin || null,
    tag: row.tag || null,
  }));

  return new Response(
    JSON.stringify({
      user_id: userId,
      total: tags.length,
      tags,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleTagLineageRequest(
  req: Request,
  supabaseClient: any,
  url: URL
): Promise<Response> {
  let tagId = url.searchParams.get("tag_id") || "";

  if (!tagId && req.method !== "GET") {
    try {
      const body = await req.json();
      tagId = body?.tag_id || "";
    } catch {
      tagId = "";
    }
  }

  if (!tagId) {
    return new Response(
      JSON.stringify({ error: "tag_id is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: tagRecord, error: tagError } = await supabaseClient
    .from("tags")
    .select(
      `
        id,
        origin_user_id,
        description,
        created_at,
        generation,
        origin:origin_user_id (
          id,
          username
        )
      `
    )
    .eq("id", tagId)
    .single();

  if (tagError || !tagRecord) {
    return new Response(
      JSON.stringify({ error: "Tag not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: carriers, error: carriersError } = await supabaseClient
    .from("user_tags")
    .select(
      `
        user_id,
        generation_depth,
        acquired_at,
        user:user_id (
          id,
          username
        )
      `
    )
    .eq("tag_id", tagId)
    .order("generation_depth", { ascending: true });

  if (carriersError) {
    return new Response(
      JSON.stringify({
        error: `Failed to load lineage: ${carriersError.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const depth = (carriers || []).reduce(
    (max: number, row: any) =>
      Math.max(max, row.generation_depth || 0),
    0
  );

  return new Response(
    JSON.stringify({
      tag: tagRecord,
      total_carriers: (carriers || []).length,
      depth,
      carriers: carriers || [],
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

