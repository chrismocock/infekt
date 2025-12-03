import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const useRedis = !!redisUrl && !!redisToken;

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter((p) => p);
    const leaderboardType = pathParts[pathParts.length - 1] || "global";
    
    let limit = parseInt(url.searchParams.get("limit") || "100");
    let offset = parseInt(url.searchParams.get("offset") || "0");

    // Allow POST body to supply pagination when called via supabase-js invoke
    if (req.method === "POST") {
      try {
        const body = await req.json();
        limit = isFinite(limit) ? limit : parseInt(body?.limit ?? "100");
        offset = isFinite(offset) ? offset : parseInt(body?.offset ?? "0");
      } catch {
        // ignore body parse errors
      }
    }

    if (!isFinite(limit)) limit = 100;
    if (!isFinite(offset)) offset = 0;

    // Phase 2: Support multiple leaderboard types
    const leaderboardKeys: Record<string, string> = {
      global: "leaderboard:global",
      growth: "leaderboard:growth",
      countries: "leaderboard:countries",
      lineage: "leaderboard:lineage",
      outbreaks: "leaderboard:outbreaks",
      variants: "leaderboard:variants",
    };

    const leaderboardKey = leaderboardKeys[leaderboardType] || leaderboardKeys.global;

    // Get top entries from Redis sorted set using REST API (when configured)
    let topEntries: any[] = [];
    if (useRedis) {
      const response = await fetch(
        `${redisUrl}/zrevrange/${encodeURIComponent(
          leaderboardKey,
        )}/${offset}/${offset + limit - 1}?withScores=true`,
        {
          headers: { Authorization: `Bearer ${redisToken}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        topEntries = data.result || [];
      }
    }

    // Phase 2: If Redis has no data yet, fall back to Postgres-based leaderboard
    // Calculate scores based on leaderboard type
    if (!topEntries || topEntries.length === 0) {
      let orderBy = "total_infections";
      let ascending = false;

      // Determine ordering based on leaderboard type
      switch (leaderboardType) {
        case "growth":
          // 24h fastest growing - calculate growth from recent tags
          orderBy = "total_infections"; // Simplified - in production, calculate 24h growth
          break;
        case "countries":
          // Most countries reached - order by countries array length
          orderBy = "countries";
          ascending = false;
          break;
        case "lineage":
          // Deepest lineage tree - order by depth
          orderBy = "depth";
          ascending = false;
          break;
        case "outbreaks":
          // Most outbreak events - order by outbreak_count
          orderBy = "outbreak_count";
          ascending = false;
          break;
        case "variants":
          // Most powerful variant chain - order by variant_chain_depth
          orderBy = "variant_chain_depth";
          ascending = false;
          break;
        default:
          orderBy = "total_infections";
          ascending = false;
      }

      const { data: strains, error: strainsError, count } = await supabaseClient
        .from("strains")
        .select("*, origin_user_id", { count: "exact" })
        .order(orderBy, { ascending })
        .range(offset, offset + limit - 1);

      if (strainsError) {
        return new Response(
          JSON.stringify({
            entries: [],
            total: 0,
            error: `Failed to fetch strains: ${strainsError.message}`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const userIds = strains?.map((s) => s.origin_user_id) || [];
      const { data: users } = await supabaseClient
        .from("users")
        .select("id, username, created_at")
        .in("id", userIds);

      const entries = (strains || []).map((strain, index) => {
        const user = users?.find((u: any) => u.id === strain.origin_user_id);
        
        // Calculate score based on leaderboard type
        let score = 0;
        switch (leaderboardType) {
          case "growth":
            score = strain.total_infections || 0; // Simplified
            break;
          case "countries":
            score = Array.isArray(strain.countries) ? strain.countries.length : 0;
            break;
          case "lineage":
            score = strain.depth || 0;
            break;
          case "outbreaks":
            score = strain.outbreak_count || 0;
            break;
          case "variants":
            score = strain.variant_chain_depth || 0;
            break;
          default:
            score = strain.total_infections || 0;
        }

        return {
          rank: offset + index + 1,
          strain_id: strain.id,
          score: score,
          total_infections: strain.total_infections,
          direct_infections: strain.direct_infections,
          indirect_infections: strain.indirect_infections,
          depth: strain.depth,
          countries: strain.countries,
          outbreak_count: strain.outbreak_count || 0,
          variant_chain_depth: strain.variant_chain_depth || 0,
          mutation_points: strain.mutation_points || 0,
          user: user || null,
        };
      });

      return new Response(
        JSON.stringify({
          entries,
          total: count ?? entries.length,
          limit,
          offset,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract strain IDs and scores
    const strainIds: string[] = [];
    const scores: Record<string, number> = {};

    for (let i = 0; i < topEntries.length; i += 2) {
      const strainId = topEntries[i] as string;
      const score = topEntries[i + 1] as number;
      strainIds.push(strainId);
      scores[strainId] = score;
    }

    // Fetch strain and user details from Postgres
    const { data: strains, error: strainsError } = await supabaseClient
      .from("strains")
      .select("*, origin_user_id")
      .in("id", strainIds);

    if (strainsError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch strains: ${strainsError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get origin user IDs
    const userIds = strains?.map((s) => s.origin_user_id) || [];
    const { data: users, error: usersError } = await supabaseClient
      .from("users")
      .select("id, username, created_at")
      .in("id", userIds);

    // Combine data
    const entries = strains
      ?.map((strain) => {
        const user = users?.find((u) => u.id === strain.origin_user_id);
        return {
          rank: strainIds.indexOf(strain.id) + 1 + offset,
          strain_id: strain.id,
          score: scores[strain.id] || 0,
          total_infections: strain.total_infections,
          direct_infections: strain.direct_infections,
          indirect_infections: strain.indirect_infections,
          depth: strain.depth,
          countries: strain.countries,
          outbreak_count: strain.outbreak_count || 0,
          variant_chain_depth: strain.variant_chain_depth || 0,
          mutation_points: strain.mutation_points || 0,
          user: user || null,
        };
      })
      .sort((a, b) => b.score - a.score) || [];

    // Get total count
    let total = 0;
    try {
      const countResponse = await fetch(
        `${redisUrl}/zcard/${encodeURIComponent(leaderboardKey)}`,
        {
          headers: { "Authorization": `Bearer ${redisToken}` },
        }
      );
      if (countResponse.ok) {
        const countData = await countResponse.json();
        total = countData.result || 0;
      }
    } catch {
      total = entries.length;
    }

    return new Response(
      JSON.stringify({
        type: leaderboardType,
        entries,
        total,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

