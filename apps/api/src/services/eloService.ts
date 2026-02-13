export function calculateEloChange(
  winnerRating: number,
  loserRating: number,
  kFactor: number,
): { winnerDelta: number; loserDelta: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const winnerDelta = Math.round(kFactor * (1 - expectedWinner));
  const loserDelta = Math.max(-loserRating, -winnerDelta);
  return { winnerDelta, loserDelta };
}
