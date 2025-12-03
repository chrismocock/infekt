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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter((p) => p);
    const action = pathParts[pathParts.length - 1] || "info";

    // GET /strain/outbreaks - Get outbreak history for a strain
    if (req.method === "GET" && action === "outbreaks") {
      const strainId = url.searchParams.get("strain_id") || url.searchParams.get("id");
      
      if (!strainId) {
        return new Response(
          JSON.stringify({ error: "strain_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const limit = parseInt(url.searchParams.get("limit") || "50");

      const { data: outbreaks, error: outbreaksError } = await supabaseClient
        .from("outbreak_events")
        .select("*")
        .eq("strain_id", strainId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (outbreaksError) {
        return new Response(
          JSON.stringify({ error: outbreaksError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Group by region and time
      const groupedOutbreaks: Record<string, any[]> = {};
      (outbreaks || []).forEach((outbreak) => {
        const key = outbreak.region_id || "unknown";
        if (!groupedOutbreaks[key]) {
          groupedOutbreaks[key] = [];
        }
        groupedOutbreaks[key].push(outbreak);
      });

      return new Response(
        JSON.stringify({
          outbreaks: outbreaks || [],
          grouped_by_region: groupedOutbreaks,
          total: (outbreaks || []).length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET /strain/timeline - Get timeline data for a strain
    if (req.method === "GET" && action === "timeline") {
      const strainId = url.searchParams.get("strain_id") || url.searchParams.get("id");
      const window = url.searchParams.get("window") || "24h"; // 24h, 7d, 30d
      
      if (!strainId) {
        return new Response(
          JSON.stringify({ error: "strain_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!["24h", "7d", "30d"].includes(window)) {
        return new Response(
          JSON.stringify({ error: "window must be 24h, 7d, or 30d" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check cache first
      const { data: cached, error: cacheError } = await supabaseClient
        .from("strain_timeline_cache")
        .select("points, updated_at")
        .eq("strain_id", strainId)
        .eq("time_window", window)
        .single();

      // Use cache if it's less than 5 minutes old
      if (cached && !cacheError) {
        const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
        if (cacheAge < 5 * 60 * 1000) {
          return new Response(
            JSON.stringify({
              strain_id: strainId,
              window: window,
              points: cached.points,
              cached: true,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Calculate timeline points using the database function
      const { data: points, error: pointsError } = await supabaseClient.rpc(
        "calculate_timeline_points",
        {
          p_strain_id: strainId,
          p_window: window,
        }
      );

      if (pointsError) {
        return new Response(
          JSON.stringify({ error: pointsError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Update cache
      await supabaseClient.rpc("update_timeline_cache", {
        p_strain_id: strainId,
        p_window: window,
      });

      return new Response(
        JSON.stringify({
          strain_id: strainId,
          window: window,
          points: points || [],
          cached: false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get strain ID from query parameter, URL path, or request body (for default /strain endpoint)
    let strainId: string | null = null;
    
    // Try query parameter first
    strainId = url.searchParams.get("id") || url.searchParams.get("strain_id");
    
    // Try URL path (for REST-style calls: /strain/{id})
    if (!strainId) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== "strain" && lastPart !== "outbreaks" && lastPart !== "timeline") {
        strainId = lastPart;
      }
    }
    
    // Try request body for POST requests (more reliable)
    if (!strainId && req.method === "POST") {
      try {
        const body = await req.json();
        strainId = body.strain_id || body.id || strainId;
      } catch {
        // Body parsing failed or already consumed
      }
    }

    if (!strainId) {
      return new Response(JSON.stringify({ error: "Strain ID required. Use ?id=... or ?strain_id=..." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get strain data
    const { data: strain, error: strainError } = await supabaseClient
      .from("strains")
      .select("*")
      .eq("id", strainId)
      .single();

    if (strainError || !strain) {
      return new Response(JSON.stringify({ error: "Strain not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get origin user
    const { data: originUser, error: userError } = await supabaseClient
      .from("users")
      .select("id, username, created_at")
      .eq("id", strain.origin_user_id)
      .single();

    // Get all tags for this strain to calculate analytics
    const { data: tags, error: tagsError } = await supabaseClient
      .from("tags")
      .select("location, created_at, generation")
      .eq("strain_id", strainId);

    // Calculate top regions (clustered by location)
    const regions: Record<string, number> = {};
    tags?.forEach((tag) => {
      if (tag.location) {
        // Simplified region grouping (in production, use reverse geocoding)
        const regionKey = "region"; // Placeholder
        regions[regionKey] = (regions[regionKey] || 0) + 1;
      }
    });

    const topRegions = Object.entries(regions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Get countries (from strain.countries JSONB)
    const countries = (strain.countries as string[]) || [];

    // Get infected users (both direct and indirect)
    const infectedUserIds = new Set<string>();
    
    // Direct infections: Get unique target_id values from tags where tagger_id = origin_user_id
    const { data: directTags, error: directTagsError } = await supabaseClient
      .from("tags")
      .select("target_id")
      .eq("tagger_id", strain.origin_user_id);
    
    if (!directTagsError && directTags) {
      directTags.forEach((tag: any) => {
        if (tag.target_id) {
          infectedUserIds.add(tag.target_id);
        }
      });
    }
    
    // Indirect infections: Get all users where root_user_id = origin_user_id
    const { data: indirectUsers, error: indirectUsersError } = await supabaseClient
      .from("users")
      .select("id")
      .eq("root_user_id", strain.origin_user_id);
    
    if (!indirectUsersError && indirectUsers) {
      indirectUsers.forEach((user: any) => {
        if (user.id && user.id !== strain.origin_user_id) {
          infectedUserIds.add(user.id);
        }
      });
    }
    
    // Fetch user details for all infected user IDs
    let infectedUsers: Array<{ id: string; username: string | null }> = [];
    if (infectedUserIds.size > 0) {
      const { data: userDetails, error: userDetailsError } = await supabaseClient
        .from("users")
        .select("id, username")
        .in("id", Array.from(infectedUserIds));
      
      if (!userDetailsError && userDetails) {
        infectedUsers = userDetails.map((user: any) => ({
          id: user.id,
          username: user.username,
        }));
      }
    }

    const analytics = {
      total_infections: strain.total_infections,
      direct_infections: strain.direct_infections,
      indirect_infections: strain.indirect_infections,
      depth: strain.depth,
      countries: countries,
      countries_count: countries.length,
      top_regions: topRegions,
      tags_count: tags?.length || 0,
      infected_users: infectedUsers,
    };

    return new Response(
      JSON.stringify({
        strain: {
          ...strain,
          origin_user: originUser,
        },
        analytics,
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

