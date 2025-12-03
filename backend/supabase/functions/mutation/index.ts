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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter((p) => p);
    const action = pathParts[pathParts.length - 1] || "tree";

    // GET /mutation/tree - Return mutation tree with unlock status
    if (req.method === "GET" && action === "tree") {
      const branch = url.searchParams.get("branch"); // Optional filter by branch

      // Get all mutation tree nodes
      let query = supabaseClient
        .from("mutation_tree_nodes")
        .select("*")
        .order("tier", { ascending: true })
        .order("branch", { ascending: true });

      if (branch) {
        query = query.eq("branch", branch);
      }

      const { data: nodes, error: nodesError } = await query;

      if (nodesError) {
        return new Response(
          JSON.stringify({ error: nodesError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get user's unlocked mutations
      const { data: unlocks, error: unlocksError } = await supabaseClient
        .from("user_mutation_unlocks")
        .select("node_id")
        .eq("user_id", user.id);

      if (unlocksError) {
        return new Response(
          JSON.stringify({ error: unlocksError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const unlockedNodeIds = new Set(
        (unlocks || []).map((u) => u.node_id)
      );

      // Get user's strain to check MP
      const { data: userData } = await supabaseClient
        .from("users")
        .select("current_strain_id")
        .eq("id", user.id)
        .single();

      let mutationPoints = 0;
      if (userData?.current_strain_id) {
        const { data: strain } = await supabaseClient
          .from("strains")
          .select("mutation_points")
          .eq("id", userData.current_strain_id)
          .single();

        mutationPoints = strain?.mutation_points || 0;
      }

      // Enrich nodes with unlock status and availability
      const enrichedNodes = (nodes || []).map((node) => {
        const isUnlocked = unlockedNodeIds.has(node.id);
        const prerequisiteUnlocked = node.prerequisite_node
          ? unlockedNodeIds.has(node.prerequisite_node)
          : true;
        const canUnlock =
          !isUnlocked &&
          prerequisiteUnlocked &&
          mutationPoints >= node.mp_cost;

        return {
          ...node,
          is_unlocked: isUnlocked,
          can_unlock: canUnlock,
          prerequisite_unlocked: prerequisiteUnlocked,
        };
      });

      return new Response(
        JSON.stringify({
          nodes: enrichedNodes,
          mutation_points: mutationPoints,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // POST /mutation/unlock - Unlock a mutation node
    if (req.method === "POST" && action === "unlock") {
      const body = await req.json();
      const { node_id } = body;

      if (!node_id) {
        return new Response(
          JSON.stringify({ error: "node_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get the mutation node
      const { data: node, error: nodeError } = await supabaseClient
        .from("mutation_tree_nodes")
        .select("*")
        .eq("id", node_id)
        .single();

      if (nodeError || !node) {
        return new Response(
          JSON.stringify({ error: "Mutation node not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if already unlocked
      const { data: existingUnlock } = await supabaseClient
        .from("user_mutation_unlocks")
        .select("node_id")
        .eq("user_id", user.id)
        .eq("node_id", node_id)
        .single();

      if (existingUnlock) {
        return new Response(
          JSON.stringify({ error: "Mutation already unlocked" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check prerequisite
      if (node.prerequisite_node) {
        const { data: prereqUnlock } = await supabaseClient
          .from("user_mutation_unlocks")
          .select("node_id")
          .eq("user_id", user.id)
          .eq("node_id", node.prerequisite_node)
          .single();

        if (!prereqUnlock) {
          return new Response(
            JSON.stringify({
              error: "Prerequisite mutation not unlocked",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Get user's strain and check MP
      const { data: userData } = await supabaseClient
        .from("users")
        .select("current_strain_id")
        .eq("id", user.id)
        .single();

      if (!userData?.current_strain_id) {
        return new Response(
          JSON.stringify({ error: "User has no active strain" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: strain, error: strainError } = await supabaseClient
        .from("strains")
        .select("mutation_points")
        .eq("id", userData.current_strain_id)
        .single();

      if (strainError || !strain) {
        return new Response(
          JSON.stringify({ error: "Strain not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (strain.mutation_points < node.mp_cost) {
        return new Response(
          JSON.stringify({
            error: "Insufficient mutation points",
            required: node.mp_cost,
            available: strain.mutation_points,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Deduct MP and create unlock record
      const { error: updateError } = await supabaseClient
        .from("strains")
        .update({
          mutation_points: strain.mutation_points - node.mp_cost,
        })
        .eq("id", userData.current_strain_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { error: unlockError } = await supabaseClient
        .from("user_mutation_unlocks")
        .insert({
          user_id: user.id,
          node_id: node_id,
        });

      if (unlockError) {
        // Rollback MP deduction
        await supabaseClient
          .from("strains")
          .update({
            mutation_points: strain.mutation_points,
          })
          .eq("id", userData.current_strain_id);

        return new Response(
          JSON.stringify({ error: unlockError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Return updated mutation tree
      const { data: updatedNodes } = await supabaseClient
        .from("mutation_tree_nodes")
        .select("*")
        .order("tier", { ascending: true });

      const { data: updatedUnlocks } = await supabaseClient
        .from("user_mutation_unlocks")
        .select("node_id")
        .eq("user_id", user.id);

      const unlockedNodeIds = new Set(
        (updatedUnlocks || []).map((u) => u.node_id)
      );

      const { data: updatedStrain } = await supabaseClient
        .from("strains")
        .select("mutation_points")
        .eq("id", userData.current_strain_id)
        .single();

      const enrichedNodes = (updatedNodes || []).map((n) => {
        const isUnlocked = unlockedNodeIds.has(n.id);
        const prerequisiteUnlocked = n.prerequisite_node
          ? unlockedNodeIds.has(n.prerequisite_node)
          : true;
        const canUnlock =
          !isUnlocked &&
          prerequisiteUnlocked &&
          (updatedStrain?.mutation_points || 0) >= n.mp_cost;

        return {
          ...n,
          is_unlocked: isUnlocked,
          can_unlock: canUnlock,
          prerequisite_unlocked: prerequisiteUnlocked,
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          node: node,
          nodes: enrichedNodes,
          mutation_points: updatedStrain?.mutation_points || 0,
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

