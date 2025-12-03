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

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST /strain/cosmetic - Set cosmetic value
    if (req.method === "POST") {
      const body = await req.json();
      const { cosmetic_type, value, is_active } = body;

      if (!cosmetic_type || !value) {
        return new Response(
          JSON.stringify({ error: "cosmetic_type and value are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate cosmetic type
      const validTypes = [
        "color",
        "particle_effect",
        "animation",
        "variant_badge",
        "mutation_badge",
      ];

      if (!validTypes.includes(cosmetic_type)) {
        return new Response(
          JSON.stringify({ error: "Invalid cosmetic_type" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if cosmetic exists for user
      const { data: existing } = await supabaseClient
        .from("strain_cosmetics")
        .select("*")
        .eq("user_id", user.id)
        .eq("cosmetic_type", cosmetic_type)
        .single();

      if (existing) {
        // Update existing cosmetic
        const { data: updated, error: updateError } = await supabaseClient
          .from("strain_cosmetics")
          .update({
            value: value,
            is_active: is_active !== undefined ? is_active : existing.is_active,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, cosmetic: updated }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        // Create new cosmetic (assume it's unlocked - validation would be in frontend)
        const { data: created, error: createError } = await supabaseClient
          .from("strain_cosmetics")
          .insert({
            user_id: user.id,
            cosmetic_type: cosmetic_type,
            value: value,
            is_active: is_active !== undefined ? is_active : true,
          })
          .select()
          .single();

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, cosmetic: created }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // GET /strain/cosmetic - Get user's cosmetics
    if (req.method === "GET") {
      const { data: cosmetics, error: cosmeticsError } = await supabaseClient
        .from("strain_cosmetics")
        .select("*")
        .eq("user_id", user.id)
        .order("cosmetic_type", { ascending: true });

      if (cosmeticsError) {
        return new Response(
          JSON.stringify({ error: cosmeticsError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ cosmetics: cosmetics || [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid method" }),
      {
        status: 405,
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

