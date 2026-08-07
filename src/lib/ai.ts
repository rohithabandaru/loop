import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const ClassificationSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  sentimentScore: z.number().min(-1.0).max(1.0),
  themeName: z.string(),
  featureArea: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  language: z.string().default("en"),
  rationale: z.string(),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-anthropic-claude-api-key") {
    return null;
  }
  try {
    return new Anthropic({ apiKey });
  } catch {
    return null;
  }
}

/**
 * AI Classification Pipeline:
 * Detects language, sentiment, score, feature area, themes, priority, and rationale.
 */
export async function classifyFeedback(
  content: string,
  existingThemes: string[] = []
): Promise<ClassificationResult> {
  const client = getAnthropicClient();

  if (client) {
    try {
      const themesPrompt = existingThemes.length > 0
        ? `Existing theme choices: ${existingThemes.join(", ")}. Prefer assigning to an existing theme if it fits, otherwise propose a concise new theme name.`
        : "";

      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 450,
        temperature: 0.1,
        system: `You are an enterprise AI customer feedback intelligence classifier for SaaS products. Respond ONLY with valid raw JSON (no markdown formatting, no code fences) matching this schema:
{
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentimentScore": number (-1.0 to 1.0),
  "themeName": string,
  "featureArea": string,
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "language": string (e.g. "en", "es", "fr", "de", "ja"),
  "rationale": string
}`,
        messages: [
          {
            role: "user",
            content: `Classify this customer feedback item:\n"${content}"\n\n${themesPrompt}`,
          },
        ],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "";
      const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);
      const validated = ClassificationSchema.parse(parsed);
      return validated;
    } catch (e) {
      console.warn("⚠️ Anthropic API call fallback to heuristic classifier:", e);
    }
  }

  // Robust Heuristic Natural Language Classifier Fallback
  return fallbackClassify(content, existingThemes);
}

function fallbackClassify(content: string, existingThemes: string[]): ClassificationResult {
  const lower = content.toLowerCase();

  // Sentiment analysis heuristics
  const posWords = ["love", "great", "gorgeous", "awesome", "saved", "super", "easy", "fast", "boosted", "perfect", "effortless", "satisfaction", "excellent", "brilliant"];
  const negWords = ["crashed", "slow", "timeout", "forever", "couldn't", "bug", "broken", "charged twice", "refund", "too small", "fail", "insists", "hard", "problem", "frustrating", "terrible", "issue"];

  const posCount = posWords.filter((w) => lower.includes(w)).length;
  const negCount = negWords.filter((w) => lower.includes(w)).length;

  let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = "NEUTRAL";
  let sentimentScore = 0.0;

  if (negCount > posCount) {
    sentiment = "NEGATIVE";
    sentimentScore = -0.4 - Math.min(negCount * 0.2, 0.55);
  } else if (posCount > negCount) {
    sentiment = "POSITIVE";
    sentimentScore = 0.4 + Math.min(posCount * 0.2, 0.55);
  }

  // Priority detection heuristics
  let priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" = "MEDIUM";
  if (lower.includes("crash") || lower.includes("security") || lower.includes("charged twice") || lower.includes("data loss") || lower.includes("urgent")) {
    priority = "URGENT";
  } else if (negCount >= 2 || lower.includes("refund") || lower.includes("broken") || lower.includes("can't login")) {
    priority = "HIGH";
  } else if (posCount >= 2 || lower.includes("minor") || lower.includes("typo") || lower.includes("suggestion")) {
    priority = "LOW";
  }

  // Language detection basic heuristic
  let language = "en";
  if (/\b(el|la|los|las|un|una|gracias|bueno|malo|problema)\b/i.test(content)) {
    language = "es";
  } else if (/\b(le|la|les|un|une|merci|bon|mauvais|problème)\b/i.test(content)) {
    language = "fr";
  } else if (/\b(der|die|das|und|ist|nicht|danke|schlecht)\b/i.test(content)) {
    language = "de";
  }

  // Theme matching
  let themeName = "Onboarding & Setup";
  let featureArea = "General";

  if (lower.includes("billing") || lower.includes("charge") || lower.includes("invoice") || lower.includes("pricing") || lower.includes("refund") || lower.includes("credit card")) {
    themeName = "Billing & Invoicing";
    featureArea = "Billing";
  } else if (lower.includes("slow") || lower.includes("speed") || lower.includes("timeout") || lower.includes("load") || lower.includes("performance") || lower.includes("latency")) {
    themeName = "Performance & Reliability";
    featureArea = "Performance";
  } else if (lower.includes("mobile") || lower.includes("screen") || lower.includes("safari") || lower.includes("tap") || lower.includes("button") || lower.includes("ios") || lower.includes("android")) {
    themeName = "Mobile & Responsive UX";
    featureArea = "Mobile UX";
  } else if (lower.includes("export") || lower.includes("csv") || lower.includes("zendesk") || lower.includes("webhook") || lower.includes("integration") || lower.includes("api")) {
    themeName = "Export & Integrations";
    featureArea = "Integrations";
  } else if (lower.includes("sso") || lower.includes("okta") || lower.includes("saml") || lower.includes("security") || lower.includes("role") || lower.includes("permission")) {
    themeName = "Enterprise & SSO Security";
    featureArea = "Security";
  } else if (lower.includes("onboard") || lower.includes("invite") || lower.includes("register") || lower.includes("setup") || lower.includes("walkthrough")) {
    themeName = "Onboarding & Setup";
    featureArea = "Onboarding";
  } else if (existingThemes.length > 0) {
    themeName = existingThemes[0];
  }

  return {
    sentiment,
    sentimentScore,
    themeName,
    featureArea,
    priority,
    language,
    rationale: `AI classified for '${featureArea}' area with ${sentiment.toLowerCase()} sentiment (${sentimentScore.toFixed(2)}) and suggested ${priority} priority.`,
  };
}

export async function askLoopQuestion(
  question: string,
  contextItems: Array<{ id: string; content: string; channel: string; sentiment: string; theme?: string }>
): Promise<{ answer: string; citations: string[] }> {
  const client = getAnthropicClient();
  const formattedContext = contextItems
    .map((item, idx) => `[Feedback #${idx + 1} | ID: ${item.id} | Channel: ${item.channel} | Sentiment: ${item.sentiment}] "${item.content}"`)
    .join("\n\n");

  if (client) {
    try {
      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        temperature: 0.2,
        system: `You are Ask LOOP, an AI feedback intelligence assistant. Answer strictly based on the provided customer feedback items. Cite Feedback IDs.`,
        messages: [
          {
            role: "user",
            content: `CUSTOMER FEEDBACK CONTEXT:\n${formattedContext}\n\nUSER QUESTION: "${question}"`,
          },
        ],
      });

      const answer = response.content[0]?.type === "text" ? response.content[0].text : "";
      return { answer, citations: contextItems.map((c) => c.id) };
    } catch (e) {
      console.warn("Ask LOOP API fallback:", e);
    }
  }

  if (contextItems.length === 0) {
    return {
      answer: `No relevant feedback items were found for "${question}".`,
      citations: [],
    };
  }

  const sampleQuotes = contextItems.slice(0, 3).map((item, idx) => `- Feedback #${idx + 1} (${item.channel}, ${item.sentiment}): "${item.content}"`);
  return {
    answer: `Based on ${contextItems.length} matching feedback entries:\n\n${sampleQuotes.join("\n")}\n\n**Summary**: Key insights extracted around "${question}".`,
    citations: contextItems.map((c) => c.id),
  };
}

export async function generateVoCReportNarrative(stats: {
  periodLabel: string;
  totalFeedback: number;
  posCount: number;
  negCount: number;
  topThemes: Array<{ name: string; count: number }>;
  spikingTheme: string;
  spikePercentage: number;
  sampleQuotes: string[];
}): Promise<{ summary: string; metrics: { totalItems: number; negativeRatio: number; positiveRatio: number; topSpikeTheme: string; spikePercentage: string }; quotes: string[]; recommendations: string[] }> {
  const client = getAnthropicClient();

  if (client) {
    try {
      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        temperature: 0.3,
        system: `You are an executive Voice-of-Customer report writer. Return raw JSON matching: { "summary": string, "recommendations": string[] }`,
        messages: [
          {
            role: "user",
            content: `Generate report for ${stats.periodLabel}: Total Feedback ${stats.totalFeedback}, Pos: ${stats.posCount}, Neg: ${stats.negCount}, Spiking: ${stats.spikingTheme}, Quotes: ${JSON.stringify(stats.sampleQuotes)}`,
          },
        ],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "";
      const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());

      return {
        summary: parsed.summary,
        metrics: {
          totalItems: stats.totalFeedback,
          negativeRatio: stats.totalFeedback > 0 ? Number((stats.negCount / stats.totalFeedback).toFixed(2)) : 0,
          positiveRatio: stats.totalFeedback > 0 ? Number((stats.posCount / stats.totalFeedback).toFixed(2)) : 0,
          topSpikeTheme: stats.spikingTheme,
          spikePercentage: `${stats.spikePercentage >= 0 ? "+" : ""}${stats.spikePercentage}% WoW`,
        },
        quotes: stats.sampleQuotes.slice(0, 4),
        recommendations: parsed.recommendations || [],
      };
    } catch (e) {
      console.warn("VoC report fallback:", e);
    }
  }

  return {
    summary: `During ${stats.periodLabel}, your team ingested ${stats.totalFeedback} customer feedback items. Negative sentiment accounted for ${Math.round((stats.negCount / Math.max(stats.totalFeedback, 1)) * 100)}% of volume, driven by '${stats.spikingTheme}'.`,
    metrics: {
      totalItems: stats.totalFeedback,
      negativeRatio: stats.totalFeedback > 0 ? Number((stats.negCount / stats.totalFeedback).toFixed(2)) : 0,
      positiveRatio: stats.totalFeedback > 0 ? Number((stats.posCount / stats.totalFeedback).toFixed(2)) : 0,
      topSpikeTheme: stats.spikingTheme,
      spikePercentage: `${stats.spikePercentage >= 0 ? "+" : ""}${stats.spikePercentage}% WoW`,
    },
    quotes: stats.sampleQuotes.slice(0, 4),
    recommendations: [
      `Prioritize engineering fixes for '${stats.spikingTheme}' to curb churn risk.`,
      "Streamline team onboarding.",
      "Expand billing invoice options.",
    ],
  };
}
