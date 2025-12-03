// Scoring logic for infections

/**
 * Calculate direct infection score
 * Direct infections always give +1 point
 */
export function calculateDirectScore(): number {
  return 1;
}

/**
 * Calculate indirect infection score based on generation depth
 * Formula: 0.5 ^ generation_depth
 */
export function calculateIndirectScore(generationDepth: number): number {
  return Math.pow(0.5, generationDepth);
}

/**
 * Calculate total score from direct and indirect infections
 */
export function calculateTotalScore(
  directInfections: number,
  indirectInfections: number
): number {
  return directInfections + indirectInfections;
}

/**
 * Example scoring:
 * - A infects B → A +1 (direct)
 * - B infects C → B +1 (direct), A +0.5 (indirect, depth 1)
 * - C infects D → C +1 (direct), B +0.5 (indirect, depth 1), A +0.25 (indirect, depth 2)
 */
export function calculateRecursiveScore(
  currentGeneration: number,
  ancestorGeneration: number
): number {
  const depth = currentGeneration - ancestorGeneration;
  if (depth <= 0) return 0;
  return Math.pow(0.5, depth);
}

// Phase 2: Enhanced scoring with multipliers

export interface ScoringMultipliers {
  outbreakMultiplier?: number;
  regionMultiplier?: number;
  mutationBoost?: number;
  variantChainBonus?: number;
}

/**
 * Calculate outbreak bonus
 * Outbreak events provide bonus points based on multiplier
 */
export function calculateOutbreakBonus(
  baseScore: number,
  outbreakMultiplier: number = 1.0
): number {
  if (outbreakMultiplier <= 1.0) return 0;
  return baseScore * (outbreakMultiplier - 1.0);
}

/**
 * Calculate variant chain bonus
 * Consecutive tags with same variant provide bonus
 */
export function calculateVariantChainBonus(chainDepth: number): number {
  return chainDepth * 0.5; // 0.5 points per chain depth
}

/**
 * Apply region multiplier to score
 */
export function applyRegionMultiplier(
  baseScore: number,
  regionMultiplier: number = 1.0
): number {
  return baseScore * regionMultiplier;
}

/**
 * Apply mutation boost to score
 */
export function applyMutationBoost(
  baseScore: number,
  mutationBoost: number = 1.0
): number {
  return baseScore * mutationBoost;
}

/**
 * Calculate enhanced total score with all Phase 2 multipliers
 * Formula: (base_score * outbreak_multiplier * region_multiplier * mutation_boost) + variant_chain_bonus
 */
export function calculateEnhancedScore(
  baseScore: number,
  multipliers: ScoringMultipliers
): number {
  const {
    outbreakMultiplier = 1.0,
    regionMultiplier = 1.0,
    mutationBoost = 1.0,
    variantChainBonus = 0.0,
  } = multipliers;

  const multipliedScore =
    baseScore * outbreakMultiplier * regionMultiplier * mutationBoost;
  return multipliedScore + variantChainBonus;
}

/**
 * Calculate total enhanced score for a strain
 * Includes: direct + indirect + outbreak bonuses + variant chain bonuses
 */
export function calculateStrainEnhancedScore(
  directInfections: number,
  indirectInfections: number,
  outbreakCount: number = 0,
  variantChainDepth: number = 0,
  mutationPoints: number = 0
): number {
  const baseScore = directInfections + indirectInfections;
  const outbreakBonus = outbreakCount * 10; // 10 points per outbreak
  const variantChainBonus = variantChainDepth * 5; // 5 points per chain depth
  const mpContribution = mutationPoints * 0.1; // 0.1 points per MP

  return baseScore + outbreakBonus + variantChainBonus + mpContribution;
}

