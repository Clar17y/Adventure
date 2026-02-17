export function calculateEloChange(
  ratingA: number,
  ratingB: number,
  kFactor: number,
  scoreA: number = 1,
): { deltaA: number; deltaB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const deltaA = Math.round(kFactor * (scoreA - expectedA));
  const deltaB = Math.max(-ratingB, -deltaA);
  return { deltaA, deltaB };
}
