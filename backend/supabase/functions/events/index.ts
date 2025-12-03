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
    const action = pathParts[pathParts.length - 1] || "events";

    // GET /global/events - Return active world events
    if (req.method === "GET" && action === "events") {
      const region = url.searchParams.get("region");
      const hours = parseInt(url.searchParams.get("hours") || "24");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      // Get active outbreak events from the last N hours
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);

      let query = supabaseClient
        .from("outbreak_events")
        .select(
          `
          *,
          strains!inner(origin_user_id, total_infections),
          users!outbreak_events_user_id_fkey(id, username)
        `
        )
        .gte("timestamp", cutoffTime.toISOString())
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (region) {
        query = query.eq("region_id", region);
      }

      const { data: events, error: eventsError } = await query;

      if (eventsError) {
        return new Response(
          JSON.stringify({ error: eventsError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Enrich events with descriptions
      const enrichedEvents = (events || []).map((event: any) => {
        const typeDescriptions: Record<string, string> = {
          club: "Nightclub outbreak detected",
          university: "University campus outbreak",
          airport: "Airport terminal outbreak",
          stadium: "Stadium event outbreak",
          festival: "Festival outbreak",
          general: "General outbreak event",
        };

        return {
          id: event.id,
          region_id: event.region_id,
          strain_id: event.strain_id,
          user_id: event.user_id,
          username: event.users?.username || "Anonymous",
          timestamp: event.timestamp,
          multiplier: event.multiplier,
          type: event.type,
          tag_count: event.tag_count,
          description:
            event.description ||
            typeDescriptions[event.type] ||
            "Outbreak event",
          location: event.location,
        };
      });

      return new Response(
        JSON.stringify({
          events: enrichedEvents,
          count: enrichedEvents.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid endpoint" }),
      {
        status: 404,
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

