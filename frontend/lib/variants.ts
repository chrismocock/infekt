// Variant rules engine

export interface VariantRules {
  tag_limit: number | null;
  time_restriction: { start: string; end: string } | null;
  radius: number;
  visibility: boolean;
}

export interface Variant {
  id: string;
  name: string;
  rules: VariantRules;
  icon_url: string | null;
  rarity: number;
}

/**
 * Validate variant rules before tagging
 */
export function validateVariantRules(
  rules: VariantRules,
  tagsGiven: number,
  currentTime: Date,
  taggerLocation: { lat: number; lng: number } | null,
  targetLocation: { lat: number; lng: number } | null
): { valid: boolean; error?: string } {
  // Check tag_limit
  if (rules.tag_limit !== null && tagsGiven >= rules.tag_limit) {
    return {
      valid: false,
      error: `Tag limit reached. Maximum ${rules.tag_limit} tags allowed for this variant.`,
    };
  }

  // Check time_restriction
  if (rules.time_restriction) {
    const { start, end } = rules.time_restriction;
    const currentTimeStr = `${currentTime.getHours()}:${String(
      currentTime.getMinutes()
    ).padStart(2, '0')}`;

    if (currentTimeStr < start || currentTimeStr > end) {
      return {
        valid: false,
        error: `Tagging not allowed at this time. Allowed: ${start} - ${end}`,
      };
    }
  }

  // Check radius (GPS proximity)
  if (rules.radius && taggerLocation && targetLocation) {
    const distance = calculateDistance(
      taggerLocation.lat,
      taggerLocation.lng,
      targetLocation.lat,
      targetLocation.lng
    );

    if (distance > rules.radius) {
      return {
        valid: false,
        error: `Target is too far away. Maximum radius: ${rules.radius}m. Distance: ${Math.round(
          distance
        )}m`,
      };
    }
  }

  return { valid: true };
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if variant is unlocked for user
 */
export function isVariantUnlocked(
  userVariants: string[],
  variantId: string
): boolean {
  return userVariants.includes(variantId);
}

/**
 * Get variant unlock conditions (for display)
 */
export function getVariantUnlockConditions(variant: Variant): string {
  // This would be expanded based on actual unlock logic
  switch (variant.rarity) {
    case 1:
      return 'Available by default';
    case 2:
      return 'Reach 10 infections';
    case 3:
      return 'Reach 50 infections';
    case 4:
      return 'Reach 100 infections';
    case 5:
      return 'Reach 500 infections';
    default:
      return 'Unknown conditions';
  }
}

