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
    const region = url.searchParams.get("region");
    const regionType = url.searchParams.get("type") || "city"; // city, school, university

    if (!region) {
      return new Response(
        JSON.stringify({ error: "region parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get regional modifier to find matching region
    const { data: regionalModifier } = await supabaseClient
      .from("regional_modifiers")
      .select("*")
      .eq("region_id", region)
      .single();

    if (!regionalModifier) {
      return new Response(
        JSON.stringify({ error: "Region not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all tags in this region (simplified - in production, use proper geospatial queries)
    // For now, we'll use outbreak events as a proxy for regional activity
    const { data: outbreaks } = await supabaseClient
      .from("outbreak_events")
      .select("strain_id, multiplier, tag_count")
      .eq("region_id", region)
      .order("timestamp", { ascending: false })
      .limit(100);

    // Group by strain and calculate regional stats
    const strainStats: Record<string, any> = {};

    (outbreaks || []).forEach((outbreak: any) => {
      if (!strainStats[outbreak.strain_id]) {
        strainStats[outbreak.strain_id] = {
          strain_id: outbreak.strain_id,
          outbreak_count: 0,
          total_multiplier: 0,
          total_tags: 0,
        };
      }
      strainStats[outbreak.strain_id].outbreak_count += 1;
      strainStats[outbreak.strain_id].total_multiplier += outbreak.multiplier || 1.0;
      strainStats[outbreak.strain_id].total_tags += outbreak.tag_count || 0;
    });

    // Get strain details
    const strainIds = Object.keys(strainStats);
    if (strainIds.length === 0) {
      return new Response(
        JSON.stringify({
          region: region,
          type: regionType,
          rankings: [],
          stats: regionalModifier,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: strains } = await supabaseClient
      .from("strains")
      .select("*, origin_user_id")
      .in("id", strainIds);

    const userIds = strains?.map((s) => s.origin_user_id) || [];
    const { data: users } = await supabaseClient
      .from("users")
      .select("id, username")
      .in("id", userIds);

    // Build rankings
    const rankings = Object.values(strainStats)
      .map((stat: any) => {
        const strain = strains?.find((s) => s.id === stat.strain_id);
        const user = users?.find((u) => u.id === strain?.origin_user_id);
        return {
          rank: 0, // Will be set after sorting
          strain_id: stat.strain_id,
          user: user || null,
          outbreak_count: stat.outbreak_count,
          total_multiplier: stat.total_multiplier,
          total_tags: stat.total_tags,
          score: stat.outbreak_count * 10 + stat.total_tags, // Scoring formula
          strain: {
            total_infections: strain?.total_infections || 0,
            depth: strain?.depth || 0,
          },
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return new Response(
      JSON.stringify({
        region: region,
        type: regionType,
        rankings: rankings,
        stats: {
          ...regionalModifier,
          total_strains: rankings.length,
          total_outbreaks: Object.values(strainStats).reduce(
            (sum: number, stat: any) => sum + stat.outbreak_count,
            0
          ),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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

