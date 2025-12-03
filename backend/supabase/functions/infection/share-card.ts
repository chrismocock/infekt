// Share Card Generation Handler
// Generates shareable images with QR codes and stats

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
  const action = pathParts[pathParts.length - 1] || "generate";

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

    if (action === "generate") {
      return await handleGenerateShareCard(req, supabaseClient);
    } else if (action === "infect") {
      return await handleShareCardInfection(req, supabaseClient, redisClient);
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

// Generate share card image
async function handleGenerateShareCard(
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
  const { userId, strainId, includeStats } = body;

  if (!userId || !strainId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get user and strain data
  const { data: user, error: userError } = await supabaseClient
    .from("users")
    .select("username")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "User not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: strain, error: strainError } = await supabaseClient
    .from("strains")
    .select("total_infections, depth, countries, direct_infections")
    .eq("id", strainId)
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

  // Generate infection link code
  const { data: linkCode } = await supabaseClient.rpc("generate_infection_link_code");
  const code = linkCode || Math.random().toString(36).substring(2, 10).toUpperCase();

  // Create infection link
  const { data: link, error: linkError } = await supabaseClient
    .from("infection_links")
    .insert({
      code,
      infector_id: userId,
      strain_id: strainId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      max_uses: null, // Unlimited
      use_count: 0,
    })
    .select("id")
    .single();

  if (linkError) {
    return new Response(
      JSON.stringify({ error: `Failed to create link: ${linkError.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Generate QR code SVG (using qrcode library via esm.sh)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`infekt://i/${code}`)}`;

  // Generate share card as SVG (simple approach - can be enhanced with Canvas API)
  const shareCardSvg = generateShareCardSVG({
    username: user.username || "Anonymous",
    totalInfections: strain.total_infections || 0,
    depth: strain.depth || 0,
    countries: (strain.countries as string[]) || [],
    qrCodeUrl,
    infectionLink: `infekt://i/${code}`,
    includeStats: includeStats !== false,
  });

  // Convert SVG to PNG using external service or store as SVG
  // For now, we'll store the SVG and return URL
  // In production, use Canvas API or image conversion service
  const fileName = `share-cards/${userId}/${strainId}-${Date.now()}.svg`;
  
  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from("share-cards")
    .upload(fileName, new TextEncoder().encode(shareCardSvg), {
      contentType: "image/svg+xml",
      upsert: false,
    });

  if (uploadError) {
    // If bucket doesn't exist, return SVG data URL instead
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(shareCardSvg)}`;
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: svgDataUrl,
        qrCodeUrl,
        infectionLink: `infekt://i/${code}`,
        linkId: code,
        message: "Share card generated (SVG data URL - configure storage bucket for permanent URLs)",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: { publicUrl } } = supabaseClient.storage
    .from("share-cards")
    .getPublicUrl(fileName);

  return new Response(
    JSON.stringify({
      success: true,
      imageUrl: publicUrl,
      qrCodeUrl,
      infectionLink: `infekt://i/${code}`,
      linkId: code,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Generate SVG share card
function generateShareCardSVG(data: {
  username: string;
  totalInfections: number;
  depth: number;
  countries: string[];
  qrCodeUrl: string;
  infectionLink: string;
  includeStats: boolean;
}): string {
  const { username, totalInfections, depth, countries, qrCodeUrl, infectionLink, includeStats } = data;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="800" height="1200" fill="url(#bgGradient)"/>
  
  <!-- Title -->
  <text x="400" y="80" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#00ff88" text-anchor="middle">
    INFEKT
  </text>
  
  <!-- Username -->
  <text x="400" y="140" font-family="Arial, sans-serif" font-size="32" fill="#ffffff" text-anchor="middle">
    @${username}
  </text>
  
  ${includeStats ? `
  <!-- Stats Box -->
  <rect x="100" y="200" width="600" height="300" rx="20" fill="#0f3460" stroke="#00ff88" stroke-width="3" opacity="0.8"/>
  
  <text x="400" y="250" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#00ff88" text-anchor="middle">
    STRAIN STATS
  </text>
  
  <text x="200" y="300" font-family="Arial, sans-serif" font-size="24" fill="#ffffff">
    Total Infections:
  </text>
  <text x="550" y="300" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#00ff88" text-anchor="end">
    ${totalInfections.toLocaleString()}
  </text>
  
  <text x="200" y="340" font-family="Arial, sans-serif" font-size="24" fill="#ffffff">
    Generation Depth:
  </text>
  <text x="550" y="340" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#00ff88" text-anchor="end">
    ${depth}
  </text>
  
  <text x="200" y="380" font-family="Arial, sans-serif" font-size="24" fill="#ffffff">
    Countries:
  </text>
  <text x="550" y="380" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#00ff88" text-anchor="end">
    ${countries.length}
  </text>
  ` : ''}
  
  <!-- QR Code -->
  <text x="400" y="${includeStats ? 580 : 350}" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#00ff88" text-anchor="middle">
    SCAN TO GET INFECTED
  </text>
  
  <image x="300" y="${includeStats ? 620 : 390}" width="200" height="200" href="${qrCodeUrl}"/>
  
  <!-- Link -->
  <text x="400" y="${includeStats ? 880 : 650}" font-family="Arial, sans-serif" font-size="20" fill="#888888" text-anchor="middle">
    ${infectionLink}
  </text>
  
  <!-- Footer -->
  <text x="400" y="1150" font-family="Arial, sans-serif" font-size="18" fill="#666666" text-anchor="middle">
    Get infected. Spread the strain.
  </text>
</svg>`;
}

// Handle share card infection
async function handleShareCardInfection(
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
  const { cardId, infectorId, location } = body;

  if (!cardId || !location) {
    return new Response(
      JSON.stringify({ error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // cardId is the infection link code
  const { data: link, error: linkError } = await supabaseClient
    .from("infection_links")
    .select("infector_id, strain_id, expires_at, max_uses, use_count")
    .eq("code", cardId)
    .single();

  if (linkError || !link) {
    return new Response(
      JSON.stringify({ error: "Invalid share card" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: "Share card has expired" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (link.max_uses && link.use_count >= link.max_uses) {
    return new Response(
      JSON.stringify({ error: "Share card has reached max uses" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const { data: strain } = await supabaseClient
    .from("strains")
    .select("origin_user_id")
    .eq("id", link.strain_id)
    .single();

  if (!strain) {
    return new Response(
      JSON.stringify({ error: "Strain not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const infectedId = strain.origin_user_id;
  const actualInfectorId = infectorId || infectedId;

  const infectionRequest: InfectionRequest = {
    infectorId: actualInfectorId,
    infectedId,
    location,
    method: "share_card",
    metadata: { cardId },
  };

  try {
    const result = await processInfection(
      supabaseClient,
      redisClient,
      infectionRequest
    );

    await supabaseClient
      .from("infection_links")
      .update({ use_count: (link.use_count || 0) + 1 })
      .eq("code", cardId);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

