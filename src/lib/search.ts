import { prisma } from "./db";

export interface RelevantFeedbackItem {
  id: string;
  content: string;
  channel: string;
  sentiment: string;
  customerLabel?: string | null;
  score: number;
}

/**
 * Semantic / Keyword Vector Search for Grounded RAG
 */
export async function searchFeedbackSemantic(
  workspaceId: string,
  query: string,
  topK: number = 5
): Promise<RelevantFeedbackItem[]> {
  // Fetch all feedback with embeddings for the tenant workspace
  const feedbacks = await prisma.feedback.findMany({
    where: { workspaceId },
    include: { embedding: true },
  });

  const queryTerms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);

  if (queryTerms.length === 0) {
    return feedbacks.slice(0, topK).map((f) => ({
      id: f.id,
      content: f.content,
      channel: f.channel,
      sentiment: f.sentiment,
      customerLabel: f.customerLabel,
      score: 1.0,
    }));
  }

  // Score each feedback entry
  const scored = feedbacks.map((item) => {
    const textLower = item.content.toLowerCase();
    let score = 0;

    // 1. Direct phrase / word matching in content
    queryTerms.forEach((term) => {
      if (textLower.includes(term)) {
        score += 2.0;
      }
    });

    // 2. Keyword matching from stored vectorJson embedding
    if (item.embedding?.vectorJson) {
      try {
        const keywords: string[] = JSON.parse(item.embedding.vectorJson);
        const matchCount = keywords.filter((k) =>
          queryTerms.some((q) => k.includes(q) || q.includes(k))
        ).length;
        score += matchCount * 1.5;
      } catch {
        // ignore parse error
      }
    }

    // 3. Feature Area & Channel boost
    if (item.featureArea && queryTerms.some((q) => item.featureArea!.toLowerCase().includes(q))) {
      score += 3.0;
    }
    if (item.channel && queryTerms.some((q) => item.channel.toLowerCase().includes(q))) {
      score += 1.5;
    }

    return {
      id: item.id,
      content: item.content,
      channel: item.channel,
      sentiment: item.sentiment,
      customerLabel: item.customerLabel,
      score,
    };
  });

  // Sort descending by score & filter non-zero (or fallback to top items if no match)
  const filtered = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  if (filtered.length === 0) {
    return scored.slice(0, topK);
  }

  return filtered.slice(0, topK);
}
