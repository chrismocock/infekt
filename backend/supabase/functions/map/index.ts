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
    let minLat = parseFloat(url.searchParams.get("minLat") || "");
    let maxLat = parseFloat(url.searchParams.get("maxLat") || "");
    let minLng = parseFloat(url.searchParams.get("minLng") || "");
    let maxLng = parseFloat(url.searchParams.get("maxLng") || "");
    let clusterCount = parseInt(url.searchParams.get("clusters") || "");

    // Allow POST body payload as fallback (frontend uses invoke with body)
    if (req.method === "POST") {
      try {
        const body = await req.json();
        minLat = isFinite(minLat) ? minLat : parseFloat(body?.minLat ?? "-90");
        maxLat = isFinite(maxLat) ? maxLat : parseFloat(body?.maxLat ?? "90");
        minLng = isFinite(minLng) ? minLng : parseFloat(body?.minLng ?? "-180");
        maxLng = isFinite(maxLng) ? maxLng : parseFloat(body?.maxLng ?? "180");
        clusterCount = isFinite(clusterCount)
          ? clusterCount
          : parseInt(body?.clusters ?? "50");
      } catch {
        // ignore body parse errors; defaults will apply
      }
    }

    if (!isFinite(minLat)) minLat = -90;
    if (!isFinite(maxLat)) maxLat = 90;
    if (!isFinite(minLng)) minLng = -180;
    if (!isFinite(maxLng)) maxLng = 180;
    if (!isFinite(clusterCount)) clusterCount = 50;

    // Create bounding box
    const bbox = `POLYGON((
      ${minLng} ${minLat},
      ${maxLng} ${minLat},
      ${maxLng} ${maxLat},
      ${minLng} ${maxLat},
      ${minLng} ${minLat}
    ))`;

    // Query tags within bounding box with clustering
    // Using PostGIS ST_ClusterKMeans for clustering
    const { data: clusters, error: clusterError } = await supabaseClient.rpc(
      "cluster_tags",
      {
        bbox_geom: bbox,
        cluster_count: clusterCount,
      }
    );

    // Fallback: if RPC doesn't exist, query directly and cluster in memory
    if (clusterError || !clusters) {
      const { data: tags, error: tagsError } = await supabaseClient
        .from("tags")
        .select("id, location, strain_id, created_at")
        .limit(10000); // Limit for performance

      if (tagsError) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch tags: ${tagsError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Filter tags to current bounds before clustering
      const boundedTags = (tags || []).filter((tag) => {
        const match = tag.location?.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
        if (!match) return false;
        const lng = parseFloat(match[1]);
        const lat = parseFloat(match[2]);
        return (
          lat >= minLat &&
          lat <= maxLat &&
          lng >= minLng &&
          lng <= maxLng
        );
      });

      // Simple clustering by grouping nearby points
      const clustered = simpleCluster(boundedTags, clusterCount);
      return new Response(JSON.stringify({ clusters: clustered }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ clusters }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Simple clustering function (fallback)
function simpleCluster(
  tags: any[],
  clusterCount: number
): Array<{ lat: number; lng: number; count: number; strain_ids: string[] }> {
  // Extract coordinates from geography points
  const points = tags
    .filter((tag) => tag.location)
    .map((tag) => {
      // Parse POINT(lng lat) format
      const match = tag.location.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
      if (match) {
        return {
          lng: parseFloat(match[1]),
          lat: parseFloat(match[2]),
          strain_id: tag.strain_id,
        };
      }
      return null;
    })
    .filter((p) => p !== null);

  // Simple grid-based clustering
  const gridSize = 0.1; // degrees
  const clusters: Record<string, any> = {};

  points.forEach((point: any) => {
    const gridKey = `${Math.floor(point.lat / gridSize)}_${Math.floor(
      point.lng / gridSize
    )}`;
    if (!clusters[gridKey]) {
      clusters[gridKey] = {
        lat: 0,
        lng: 0,
        count: 0,
        strain_ids: new Set<string>(),
      };
    }
    clusters[gridKey].lat += point.lat;
    clusters[gridKey].lng += point.lng;
    clusters[gridKey].count++;
    clusters[gridKey].strain_ids.add(point.strain_id);
  });

  return Object.values(clusters).map((cluster: any) => ({
    lat: cluster.lat / cluster.count,
    lng: cluster.lng / cluster.count,
    count: cluster.count,
    strain_ids: Array.from(cluster.strain_ids),
  }));
}

