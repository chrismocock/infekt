// Unified Infection Engine
// Handles all infection methods with validation, scoring, lineage, and event tracking

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type InfectionMethod =
  | "direct"
  | "qr"
  | "deep_link"
  | "chat_link"
  | "share_card"
  | "story_qr"
  | "tag_drop"
  | "group_infection"
  | "proximity"
  | "hotspot"
  | "event"
  | "chain_reaction"
  | "ambient"
  | "outbreak_zone"
  | "mutant_tag"
  | "npc";

export interface InfectionRequest {
  infectorId: string;
  infectedId: string;
  location: { lat: number; lng: number };
  method: InfectionMethod;
  variantId?: string;
  tagIds?: string[]; // For multi-tag infections
  metadata?: Record<string, any>; // Method-specific data
}

export interface InfectionResult {
  success: boolean;
  infectionEventId: string;
  tagIds: string[];
  score: number;
  multipliers: {
    outbreak: number;
    region: number;
    mutation: number;
    variant_chain: number;
    method: number;
  };
  propagation?: any;
  mpAwarded?: number;
  outbreakTriggered?: boolean;
  unlockedVariants?: string[];
}

interface VariantRules {
  tag_limit: number | null;
  time_restriction: { start: string; end: string } | null;
  radius: number;
  visibility: boolean;
}

interface RedisClient {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, seconds: number, value: string) => Promise<void>;
  zadd: (key: string, score: number, member: string) => Promise<void>;
}

// Method-specific multipliers
const METHOD_MULTIPLIERS: Record<InfectionMethod, number> = {
  direct: 1.0,
  qr: 1.0,
  deep_link: 1.0,
  chat_link: 1.0,
  share_card: 1.0,
  story_qr: 1.0,
  tag_drop: 1.0,
  group_infection: 1.0,
  proximity: 1.2, // +20%
  hotspot: 1.15, // +15%
  event: 1.0,
  chain_reaction: 1.5, // +50%
  ambient: 0.5, // Lower for passive
  outbreak_zone: 1.0,
  mutant_tag: 1.0,
  npc: 1.0,
};

export async function processInfection(
  supabaseClient: any,
  redisClient: RedisClient | null,
  request: InfectionRequest
): Promise<InfectionResult> {
  const {
    infectorId,
    infectedId,
    location,
    method,
    variantId,
    tagIds = [],
    metadata = {},
  } = request;

  // 1. Validate infection
  const validation = await validateInfection(
    supabaseClient,
    redisClient,
    infectorId,
    infectedId,
    method,
    metadata
  );

  if (!validation.valid) {
    throw new Error(validation.error || "Infection validation failed");
  }

  // 2. Get users and strain data
  const { data: infector, error: infectorError } = await supabaseClient
    .from("users")
    .select("*, current_strain_id, current_variant_id, tags_given, last_location, generation, root_user_id")
    .eq("id", infectorId)
    .single();

  if (infectorError || !infector) {
    throw new Error("Infector not found");
  }

  const { data: infected, error: infectedError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", infectedId)
    .single();

  if (infectedError || !infected) {
    throw new Error("Infected user not found");
  }

  const { data: strain, error: strainError } = await supabaseClient
    .from("strains")
    .select("*")
    .eq("id", infector.current_strain_id)
    .single();

  if (strainError || !strain) {
    throw new Error("Strain not found");
  }

  // 3. Validate variant rules if provided
  const activeVariantId = variantId || infector.current_variant_id;
  let variantRules: VariantRules | null = null;

  if (activeVariantId) {
    const { data: variant, error: variantError } = await supabaseClient
      .from("variants")
      .select("*")
      .eq("id", activeVariantId)
      .single();

    if (!variantError && variant) {
      variantRules = variant.rules as VariantRules;

      // Validate tag_limit
      if (
        variantRules.tag_limit !== null &&
        infector.tags_given >= variantRules.tag_limit
      ) {
        throw new Error("Tag limit reached for this variant");
      }

      // Validate time_restriction
      if (variantRules.time_restriction) {
        const now = new Date();
        const currentTime = `${now.getHours()}:${now.getMinutes()}`;
        const { start, end } = variantRules.time_restriction;
        if (currentTime < start || currentTime > end) {
          throw new Error("Tagging not allowed at this time for this variant");
        }
      }

      // Validate radius (GPS proximity) - skip for some methods
      if (
        !["qr", "deep_link", "chat_link", "share_card", "story_qr", "tag_drop", "group_infection", "ambient", "npc"].includes(method) &&
        infector.last_location &&
        variantRules.radius &&
        infected.last_location
      ) {
        const { data: distanceData } = await supabaseClient.rpc("calculate_distance", {
          point1: infector.last_location,
          point2: infected.last_location,
        });

        if (distanceData && distanceData > variantRules.radius) {
          throw new Error(
            `Target is too far away. Maximum radius: ${variantRules.radius}m`
          );
        }
      }
    }
  }

  // 4. Ensure root tags exist
  await ensureUserRootTag(supabaseClient, infectorId, infector.current_strain_id);
  await ensureUserRootTag(
    supabaseClient,
    infectedId,
    infected.current_strain_id || infector.current_strain_id
  );

  // 5. Calculate generation depth
  const parentGeneration = infector.generation || 0;
  const newGeneration = parentGeneration + 1;
  const rootUserId = infector.root_user_id || infectorId;

  // Get parent_tag_id
  const { data: parentTag } = await supabaseClient
    .from("tags")
    .select("id")
    .eq("target_id", infectorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 6. Calculate multipliers
  const locationPoint = `POINT(${location.lng} ${location.lat})`;

  // Outbreak zone detection
  let outbreakMultiplier = 1.0;
  let regionMultiplier = 1.0;
  let outbreakType = "general";
  let regionId = "unknown";

  const { data: outbreakZone } = await supabaseClient.rpc("detect_outbreak_zone", {
    lat: location.lat,
    lng: location.lng,
    radius_meters: 1000,
  });

  if (outbreakZone && outbreakZone.length > 0) {
    outbreakType = outbreakZone[0].zone_type || "general";
    outbreakMultiplier = outbreakZone[0].multiplier || 1.0;
    regionId = outbreakZone[0].region_id || "unknown";
  }

  // Regional modifier
  if (regionId !== "unknown") {
    const { data: regionalModifier } = await supabaseClient
      .from("regional_modifiers")
      .select("*")
      .eq("region_id", regionId)
      .maybeSingle();

    if (regionalModifier) {
      regionMultiplier = regionalModifier.spread_multiplier || 1.0;
    }
  }

  // Mutation boosts
  let mutationBoost = 1.0;
  const { data: userMutations } = await supabaseClient
    .from("user_mutation_unlocks")
    .select("node_id, mutation_tree_nodes!inner(boost)")
    .eq("user_id", infectorId);

  if (userMutations && userMutations.length > 0) {
    for (const mutation of userMutations) {
      const boost = mutation.mutation_tree_nodes?.boost || {};
      if (boost.spread_multiplier) {
        mutationBoost *= boost.spread_multiplier;
      }
      if (boost.radius_boost && variantRules) {
        variantRules.radius = (variantRules.radius || 0) + (boost.radius_boost || 0);
      }
    }
  }

  // Variant chain bonus
  let variantChainBonus = 0.0;
  let variantChainDepth = 0;
  if (activeVariantId) {
    const { data: variantChain } = await supabaseClient
      .from("tags")
      .select("variant_id, generation")
      .eq("strain_id", infector.current_strain_id)
      .eq("variant_id", activeVariantId)
      .order("generation", { ascending: false })
      .limit(10);

    variantChainDepth = (variantChain || []).length + 1;
    variantChainBonus = variantChainDepth * 0.5;
  }

  // Method multiplier
  const methodMultiplier = METHOD_MULTIPLIERS[method] || 1.0;

  // 7. Create tags (support multi-tag infection)
  const createdTagIds: string[] = [];
  const baseTagCount = tagIds.length > 0 ? tagIds.length : 1;

  for (let i = 0; i < baseTagCount; i++) {
    const { data: newTag, error: tagError } = await supabaseClient
      .from("tags")
      .insert({
        tagger_id: infectorId,
        target_id: infectedId,
        strain_id: infector.current_strain_id,
        variant_id: activeVariantId,
        parent_tag_id: parentTag?.id || null,
        root_user_id: rootUserId,
        origin_user_id: rootUserId,
        location: locationPoint,
        generation: newGeneration,
        created_at: new Date().toISOString(),
        outbreak_multiplier: outbreakMultiplier,
        region_multiplier: regionMultiplier,
        mutation_boost: mutationBoost,
        variant_chain_bonus: variantChainBonus,
        final_score:
          1.0 *
          outbreakMultiplier *
          regionMultiplier *
          mutationBoost *
          methodMultiplier +
          variantChainBonus,
        infection_method: method,
      })
      .select("id")
      .single();

    if (tagError) {
      throw new Error(`Failed to create tag: ${tagError.message}`);
    }

    createdTagIds.push(newTag.id);
  }

  // 8. Create infection event
  const { data: infectionEvent, error: eventError } = await supabaseClient
    .from("infection_events")
    .insert({
      infector_id: infectorId,
      infected_id: infectedId,
      tag_ids: createdTagIds,
      method: method,
      location: locationPoint,
      timestamp: new Date().toISOString(),
      tier: 0, // Direct infection
      metadata: metadata,
    })
    .select("id")
    .single();

  if (eventError) {
    throw new Error(`Failed to create infection event: ${eventError.message}`);
  }

  // 9. Update tags with infection_event_id
  await supabaseClient
    .from("tags")
    .update({ infection_event_id: infectionEvent.id })
    .in("id", createdTagIds);

  // 10. Update infected user
  const targetRootUserId = infected.root_user_id || rootUserId;
  await supabaseClient.from("users").update({
    parent_user_id: infectorId,
    root_user_id: targetRootUserId,
    generation: newGeneration,
    current_strain_id: infector.current_strain_id,
    tags_received: (infected.tags_received || 0) + baseTagCount,
    last_location: locationPoint,
  }).eq("id", infectedId);

  // 11. Propagate user tags
  const propagationResult = await propagateUserTags(
    supabaseClient,
    infectorId,
    infectedId
  );

  // 12. Update infector
  await supabaseClient.from("users").update({
    tags_given: (infector.tags_given || 0) + baseTagCount,
    last_location: locationPoint,
  }).eq("id", infectorId);

  // 13. Calculate and update scores
  const baseScore = 1.0 * baseTagCount;
  const enhancedScore =
    baseScore *
    outbreakMultiplier *
    regionMultiplier *
    mutationBoost *
    methodMultiplier +
    variantChainBonus;

  await supabaseClient.from("strains").update({
    direct_infections: (strain.direct_infections || 0) + baseTagCount,
    total_infections: (strain.total_infections || 0) + enhancedScore,
  }).eq("id", infector.current_strain_id);

  // 14. Award mutation points
  let mpAwarded = 0;
  const newTotalInfections = (strain.total_infections || 0) + enhancedScore;

  if (newTotalInfections >= 100 && (strain.total_infections || 0) < 100) {
    mpAwarded += 5;
  }
  if (newTotalInfections >= 500 && (strain.total_infections || 0) < 500) {
    mpAwarded += 10;
  }
  if (newTotalInfections >= 1000 && (strain.total_infections || 0) < 1000) {
    mpAwarded += 20;
  }

  if (newGeneration >= 10 && (strain.depth || 0) < 10) {
    mpAwarded += 5;
  }
  if (newGeneration >= 20 && (strain.depth || 0) < 20) {
    mpAwarded += 10;
  }
  if (newGeneration >= 50 && (strain.depth || 0) < 50) {
    mpAwarded += 25;
  }

  if (outbreakMultiplier > 2.0) {
    mpAwarded += 2;
  }

  if (mpAwarded > 0) {
    await supabaseClient.rpc("award_mutation_points", {
      p_strain_id: infector.current_strain_id,
      p_points: mpAwarded,
      p_reason: "infection_milestone",
    });
  }

  // 15. Update variant chain depth
  if (variantChainDepth > 0) {
    await supabaseClient.rpc("update_variant_chain_depth", {
      p_strain_id: infector.current_strain_id,
      p_depth: variantChainDepth,
    });
  }

  // 16. Check for outbreak trigger
  let outbreakTriggered = false;
  if (outbreakMultiplier > 5.0) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data: recentTags } = await supabaseClient
      .from("tags")
      .select("id")
      .gte("created_at", oneHourAgo.toISOString())
      .eq("strain_id", infector.current_strain_id);

    const tagCount = (recentTags || []).length;

    if (tagCount >= 5) {
      await supabaseClient.rpc("create_outbreak_event", {
        p_region_id: regionId,
        p_strain_id: infector.current_strain_id,
        p_user_id: infectorId,
        p_multiplier: outbreakMultiplier,
        p_type: outbreakType,
        p_lat: location.lat,
        p_lng: location.lng,
        p_tag_count: tagCount,
      });

      await supabaseClient.rpc("increment_outbreak_count", {
        p_strain_id: infector.current_strain_id,
      });

      outbreakTriggered = true;
    }
  }

  // 17. Update lineage recursively
  for (const tagId of createdTagIds) {
    await updateLineage(
      supabaseClient,
      redisClient,
      tagId,
      rootUserId,
      newGeneration
    );
  }

  // 18. Check variant unlocks
  const unlockedVariants = await checkVariantUnlocks(
    supabaseClient,
    infectorId,
    strain
  );

  // 19. Set cooldown
  if (redisClient) {
    const cooldownKey = `cooldown:infection:${infectorId}:${method}`;
    await redisClient.setex(cooldownKey, 300, "1"); // 5 minutes
  }

  // 20. Trigger notifications (async, don't wait)
  triggerNotifications(supabaseClient, infectorId, infectedId, method).catch(
    console.error
  );

  return {
    success: true,
    infectionEventId: infectionEvent.id,
    tagIds: createdTagIds,
    score: enhancedScore,
    multipliers: {
      outbreak: outbreakMultiplier,
      region: regionMultiplier,
      mutation: mutationBoost,
      variant_chain: variantChainBonus,
      method: methodMultiplier,
    },
    propagation: propagationResult,
    mpAwarded,
    outbreakTriggered,
    unlockedVariants,
  };
}

async function validateInfection(
  supabaseClient: any,
  redisClient: RedisClient | null,
  infectorId: string,
  infectedId: string,
  method: InfectionMethod,
  metadata: Record<string, any>
): Promise<{ valid: boolean; error?: string }> {
  // Prevent self-infection
  if (infectorId === infectedId) {
    return { valid: false, error: "Cannot infect yourself" };
  }

  // Check cooldown (method-specific)
  if (redisClient) {
    const cooldownKey = `cooldown:infection:${infectorId}:${method}`;
    const cooldown = await redisClient.get(cooldownKey);
    if (cooldown) {
      return { valid: false, error: "Infection cooldown active. Please wait." };
    }
  }

  // Method-specific validations
  if (method === "proximity") {
    const signalStrength = metadata.signalStrength || 0;
    if (signalStrength < -80) {
      return { valid: false, error: "Signal strength too weak" };
    }
  }

  if (method === "tag_drop") {
    const dropId = metadata.dropId;
    if (!dropId) {
      return { valid: false, error: "Drop ID required" };
    }

    const { data: drop } = await supabaseClient
      .from("tag_drops")
      .select("*")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return { valid: false, error: "Tag drop not found" };
    }

    if (new Date(drop.expires_at) < new Date()) {
      return { valid: false, error: "Tag drop has expired" };
    }

    const claimedBy = (drop.claimed_by as string[]) || [];
    if (claimedBy.includes(infectedId)) {
      return { valid: false, error: "Tag drop already claimed" };
    }
  }

  return { valid: true };
}

async function ensureUserRootTag(
  supabaseClient: any,
  userId: string,
  strainId: string | null
): Promise<string> {
  if (!strainId) {
    throw new Error("Unable to ensure root tag without strain context");
  }

  const { data: existing } = await supabaseClient
    .from("user_tags")
    .select("tag_id")
    .eq("user_id", userId)
    .eq("origin_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing?.tag_id) {
    return existing.tag_id;
  }

  const { data: existingTag } = await supabaseClient
    .from("tags")
    .select("id")
    .eq("origin_user_id", userId)
    .eq("tagger_id", userId)
    .eq("target_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let rootTagId = existingTag?.id || null;

  if (!rootTagId) {
    const { data: rootTag, error: createError } = await supabaseClient
      .from("tags")
      .insert({
        tagger_id: userId,
        target_id: userId,
        strain_id: strainId,
        variant_id: null,
        parent_tag_id: null,
        root_user_id: userId,
        origin_user_id: userId,
        location: null,
        generation: 0,
        description: "Root tag",
      })
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    rootTagId = rootTag.id;
  }

  try {
    await supabaseClient.from("user_tags").insert({
      user_id: userId,
      tag_id: rootTagId,
      origin_user_id: userId,
      generation_depth: 0,
    });
  } catch (error: any) {
    const message = String(error?.message || "");
    if (!message.includes("duplicate key value")) {
      throw error;
    }
  }

  return rootTagId;
}

async function propagateUserTags(
  supabaseClient: any,
  taggerId: string,
  targetId: string
): Promise<any> {
  const { data: carrierRows, error: carrierError } = await supabaseClient
    .from("user_tags")
    .select("user_id, tag_id, origin_user_id, generation_depth")
    .in("user_id", [taggerId, targetId]);

  if (carrierError) {
    throw new Error(`Failed to load carrier tags: ${carrierError.message}`);
  }

  const taggerTags = (carrierRows || []).filter(
    (row: any) => row.user_id === taggerId
  );
  const targetTags = (carrierRows || []).filter(
    (row: any) => row.user_id === targetId
  );

  const targetSet = new Set(
    targetTags.map((row: any) => row.tag_id) as string[]
  );

  const tagsToInsert = taggerTags
    .filter((row: any) => !targetSet.has(row.tag_id))
    .map((row: any) => {
      targetSet.add(row.tag_id);
      return {
        user_id: targetId,
        tag_id: row.tag_id,
        origin_user_id: row.origin_user_id,
        generation_depth: (row.generation_depth || 0) + 1,
      };
    });

  let insertedRows: any[] = [];
  if (tagsToInsert.length > 0) {
    const { data: inserted, error: insertError } = await supabaseClient
      .from("user_tags")
      .insert(tagsToInsert)
      .select("tag_id, origin_user_id, generation_depth");

    if (insertError) {
      throw new Error(`Failed to propagate tags: ${insertError.message}`);
    }

    insertedRows = inserted || [];
  }

  const scoreMap = new Map<string, { direct: number; indirect: number }>();
  insertedRows.forEach((row: any) => {
    const entry = scoreMap.get(row.origin_user_id) || {
      direct: 0,
      indirect: 0,
    };
    entry.direct += 1;
    entry.indirect += Math.pow(0.5, row.generation_depth || 0);
    scoreMap.set(row.origin_user_id, entry);
  });

  const scoreSummary: any[] = [];
  const originUserMap = new Map<
    string,
    { id: string; username: string | null; direct_score: number; indirect_score: number }
  >();

  if (scoreMap.size > 0) {
    const originIds = Array.from(scoreMap.keys());
    if (originIds.length > 0) {
      const { data: originUsers } = await supabaseClient
        .from("users")
        .select("id, username, direct_score, indirect_score")
        .in("id", originIds);

      (originUsers || []).forEach((user: any) => {
        originUserMap.set(user.id, {
          id: user.id,
          username: user.username || null,
          direct_score: user.direct_score || 0,
          indirect_score: user.indirect_score || 0,
        });
      });

      const updates = originIds.map((originId) => {
        const increments = scoreMap.get(originId)!;
        const base = originUserMap.get(originId) || {
          id: originId,
          username: null,
          direct_score: 0,
          indirect_score: 0,
        };

        const nextDirect = (base.direct_score || 0) + increments.direct;
        const nextIndirect = (base.indirect_score || 0) + increments.indirect;

        originUserMap.set(originId, {
          id: originId,
          username: base.username,
          direct_score: nextDirect,
          indirect_score: nextIndirect,
        });

        scoreSummary.push({
          origin_user_id: originId,
          username: base.username,
          direct_increment: increments.direct,
          indirect_increment: increments.indirect,
          totals: {
            direct_score: nextDirect,
            indirect_score: nextIndirect,
          },
        });

        return {
          id: originId,
          direct_score: nextDirect,
          indirect_score: nextIndirect,
        };
      });

      if (updates.length > 0) {
        await supabaseClient.from("users").upsert(updates, { onConflict: "id" });
      }
    }
  }

  return {
    transmitted: insertedRows.length,
    final_tag_count: targetSet.size,
    new_tags: insertedRows.map((row: any) => {
      const originInfo = originUserMap.get(row.origin_user_id);
      return {
        tag_id: row.tag_id,
        origin_user_id: row.origin_user_id,
        origin_username: originInfo?.username || null,
        generation_depth: row.generation_depth,
      };
    }),
    score_summary: scoreSummary,
  };
}

async function updateLineage(
  supabaseClient: any,
  redisClient: RedisClient | null,
  tagId: string,
  rootUserId: string,
  currentGeneration: number
): Promise<void> {
  const { data: tag } = await supabaseClient
    .from("tags")
    .select("*, parent_tag_id, strain_id")
    .eq("id", tagId)
    .single();

  if (!tag || !tag.parent_tag_id) {
    return; // Root tag, no ancestors
  }

  const { data: parentTag } = await supabaseClient
    .from("tags")
    .select("*, tagger_id, strain_id, generation")
    .eq("id", tag.parent_tag_id)
    .single();

  if (!parentTag) {
    return;
  }

  const generationDiff = currentGeneration - parentTag.generation;
  const baseScore = Math.pow(0.5, generationDiff);

  const tagMultipliers = tag.outbreak_multiplier || 1.0;
  const tagRegionMultiplier = tag.region_multiplier || 1.0;
  const tagMutationBoost = tag.mutation_boost || 1.0;
  const tagVariantChainBonus = tag.variant_chain_bonus || 0.0;

  const enhancedScore =
    (baseScore * tagMultipliers * tagRegionMultiplier * tagMutationBoost) +
    tagVariantChainBonus;

  const { data: parentStrain } = await supabaseClient
    .from("strains")
    .select("indirect_infections, total_infections")
    .eq("id", parentTag.strain_id)
    .single();

  if (parentStrain) {
    const newIndirect = (parentStrain.indirect_infections || 0) + enhancedScore;
    const newTotal = (parentStrain.total_infections || 0) + enhancedScore;

    await supabaseClient.from("strains").update({
      indirect_infections: newIndirect,
      total_infections: newTotal,
    }).eq("id", parentTag.strain_id);

    if (redisClient) {
      await redisClient.zadd("leaderboard:global", newTotal, parentTag.strain_id);
    }
  }

  if (parentTag.parent_tag_id) {
    await updateLineage(
      supabaseClient,
      redisClient,
      parentTag.id,
      rootUserId,
      parentTag.generation
    );
  }
}

async function checkVariantUnlocks(
  supabaseClient: any,
  userId: string,
  strain: any
): Promise<string[]> {
  const unlocked: string[] = [];

  const { data: variants } = await supabaseClient.from("variants").select("*");

  const { data: userVariants } = await supabaseClient
    .from("user_variants")
    .select("variant_id")
    .eq("user_id", userId);

  const unlockedVariantIds = (userVariants || []).map((uv: any) => uv.variant_id);

  for (const variant of variants || []) {
    if (unlockedVariantIds.includes(variant.id)) {
      continue;
    }

    let shouldUnlock = false;
    switch (variant.rarity) {
      case 1:
        shouldUnlock = true;
        break;
      case 2:
        shouldUnlock = (strain.total_infections || 0) >= 10;
        break;
      case 3:
        shouldUnlock = (strain.total_infections || 0) >= 50;
        break;
      case 4:
        shouldUnlock = (strain.total_infections || 0) >= 100;
        break;
      case 5:
        shouldUnlock = (strain.total_infections || 0) >= 500;
        break;
    }

    if (shouldUnlock) {
      await supabaseClient.from("user_variants").insert({
        user_id: userId,
        variant_id: variant.id,
        unlocked_at: new Date().toISOString(),
      });

      unlocked.push(variant.id);
    }
  }

  return unlocked;
}

async function triggerNotifications(
  supabaseClient: any,
  infectorId: string,
  infectedId: string,
  method: InfectionMethod
): Promise<void> {
  // Get usernames
  const { data: infector } = await supabaseClient
    .from("users")
    .select("username")
    .eq("id", infectorId)
    .single();

  const { data: infected } = await supabaseClient
    .from("users")
    .select("username")
    .eq("id", infectedId)
    .single();

  // Send notification to infected user
  try {
    await supabaseClient.functions.invoke("notify", {
      body: {
        userId: infectedId,
        title: "You've been infected!",
        body: `${infector?.username || "Someone"} infected you via ${method}`,
        data: { type: "infection", infectorId, method },
      },
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }

  // Send notification to infector (optional, for some methods)
  if (["direct", "qr", "proximity"].includes(method)) {
    try {
      await supabaseClient.functions.invoke("notify", {
        body: {
          userId: infectorId,
          title: "Infection successful!",
          body: `You infected ${infected?.username || "someone"} via ${method}`,
          data: { type: "infection_success", infectedId, method },
        },
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }
}

