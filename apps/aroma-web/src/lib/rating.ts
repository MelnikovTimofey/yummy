type RatedMix = { avgRating: number; ratingsCount: number };

export const applyGuestRating = <T extends RatedMix>(
  mix: T,
  result: { averageRating: number; ratingCount: number },
): T => ({
  ...mix,
  avgRating: Number.isFinite(result.averageRating) ? result.averageRating : mix.avgRating,
  ratingsCount: Number.isFinite(result.ratingCount) ? result.ratingCount : mix.ratingsCount + 1,
});
