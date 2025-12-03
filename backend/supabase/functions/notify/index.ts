import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  type: 'tag_received' | 'strain_spread' | 'variant_unlocked' | 'descendant_tag';
  title: string;
  body: string;
  data?: any;
}

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

    const { user_id, type, title, body, data }: NotificationRequest =
      await req.json();

    // Get user's device tokens
    // TODO: Query device_tokens table
    // const { data: tokens } = await supabaseClient
    //   .from('device_tokens')
    //   .select('token')
    //   .eq('user_id', user_id);

    // Send push notification via Expo
    // This would integrate with Expo's push notification service
    // For now, this is a placeholder

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
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

