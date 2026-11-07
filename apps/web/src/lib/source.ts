/** Ideas imported from Razorpay's Fix My Itch carry this tag and source. */
export const FIX_MY_ITCH = "fix-my-itch";
export const FIX_MY_ITCH_URL = "https://razorpay.com/m/fix-my-itch/";

/** The score column: the source's own score, "Top 10" for its curated list, else our heat. */
export function scoreLabel(
  idea: { source_rank?: number | null; source_score?: number | null },
  heat: number,
): string {
  if (idea.source_score !== null && idea.source_score !== undefined)
    return idea.source_score.toFixed(1);
  if (idea.source_rank !== null && idea.source_rank !== undefined && idea.source_rank <= 10)
    return "Top 10";
  return heat.toFixed(1);
}
