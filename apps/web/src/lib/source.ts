/** Curated "problems worth solving" carry this tag. */
export const CURATED_TAG = "worth-solving";

/** The score column: the curated score, "Top 10" for the top of the list, else our heat. */
export function scoreLabel(
  idea: { source_rank?: number | null; source_score?: number | null },
  heat: number,
): string {
  if (idea.source_score !== null && idea.source_score !== undefined) {
    return idea.source_score.toFixed(1);
  }
  if (idea.source_rank !== null && idea.source_rank !== undefined && idea.source_rank <= 10) {
    return "Top 10";
  }
  return heat.toFixed(1);
}
