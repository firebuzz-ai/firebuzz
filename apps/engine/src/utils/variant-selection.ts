import type { ABTestVariant } from "@firebuzz/shared-types/campaign";

/**
 * Select a variant using weighted randomness based on traffic allocation
 * This is used in preview mode instead of Durable Objects
 */
export function selectVariantByWeight(variants: ABTestVariant[]): string {
	if (variants.length === 0) {
		throw new Error("No variants available for selection");
	}

	if (variants.length === 1) {
		return variants[0].id;
	}

	// Calculate total weight to normalize
	const totalWeight = variants.reduce(
		(sum, variant) => sum + variant.trafficAllocation,
		0,
	);

	if (totalWeight === 0) {
		// If all weights are 0, return first variant
		return variants[0].id;
	}

	// Generate random number between 0 and total weight
	const random = Math.random() * totalWeight;

	// Find the variant that corresponds to this random number
	let cumulativeWeight = 0;
	for (const variant of variants) {
		cumulativeWeight += variant.trafficAllocation;
		if (random < cumulativeWeight) {
			return variant.id;
		}
	}

	// Fallback to last variant (should not happen with proper weights)
	return variants[variants.length - 1].id;
}
