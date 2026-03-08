import { chatCompletion, MODELS } from "@/lib/groq";
import pool from "@/lib/db";

export interface BiasAnalysis {
  id?: number;
  event_topic: string;
  sources: {
    name: string;
    category: string;
    region: string;
    headline: string;
    bias_score: number; // -1 (heavy bias) to 1 (neutral)
    propaganda_indicators: string[];
    narrative_framing: string;
  }[];
  overall_assessment: string;
  propaganda_index: number; // 0-100
  created_at?: string;
}

// Analyze bias across multiple sources covering the same event
export async function analyzeBias(
  eventTopic: string,
  articles: { id: number; title: string; summary: string; source_name: string; source_category: string; region: string }[]
): Promise<BiasAnalysis> {
  const articlesContext = articles
    .map(
      (a, i) =>
        `[Source ${i + 1}] ${a.source_name} (${a.source_category}, ${a.region})\nHeadline: ${a.title}\nSummary: ${a.summary}`
    )
    .join("\n\n");

  const result = await chatCompletion(
    MODELS.quality,
    [
      {
        role: "system",
        content: `You are an expert media bias analyst. Analyze how different news sources cover the same event.
For each source, evaluate:
- bias_score: -1 (heavily biased/propaganda) to 1 (completely neutral/factual)
- propaganda_indicators: list of specific propaganda techniques used (loaded language, omission, false equivalence, appeal to emotion, etc.)
- narrative_framing: brief description of how the source frames the event

Return JSON:
{
  "sources": [{"name": "", "category": "", "region": "", "headline": "", "bias_score": 0, "propaganda_indicators": [], "narrative_framing": ""}],
  "overall_assessment": "2-3 sentence comparison of coverage differences",
  "propaganda_index": 0-100 (average propaganda level across all sources)
}`,
      },
      {
        role: "user",
        content: `Event/Topic: ${eventTopic}\n\nArticles:\n${articlesContext}`,
      },
    ],
    { response_format: { type: "json_object" }, max_tokens: 4096 }
  );

  try {
    const parsed = JSON.parse(result.choices[0]?.message?.content || "{}");

    // Save to DB
    const articleIds = articles.map((a) => a.id);
    await pool.query(
      `INSERT INTO bias_analyses (event_topic, article_ids, analysis) VALUES ($1, $2, $3)`,
      [eventTopic, articleIds, JSON.stringify(parsed)]
    );

    return {
      event_topic: eventTopic,
      ...parsed,
    };
  } catch {
    throw new Error("Failed to parse bias analysis");
  }
}

// Get recent bias analyses
export async function getRecentBiasAnalyses(limit: number = 10): Promise<BiasAnalysis[]> {
  const result = await pool.query(
    `SELECT * FROM bias_analyses ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map((row) => ({
    id: row.id,
    event_topic: row.event_topic,
    ...row.analysis,
    created_at: row.created_at,
  }));
}
