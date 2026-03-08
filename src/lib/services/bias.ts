import { chatCompletion, MODELS } from "@/lib/groq";
import { query } from "@/lib/db";

export interface BiasAnalysis {
  id?: number;
  event_topic: string;
  sources: {
    name: string;
    category: string;
    region: string;
    headline: string;
    bias_score: number;
    propaganda_indicators: string[];
    narrative_framing: string;
  }[];
  overall_assessment: string;
  propaganda_index: number;
  created_at?: string;
}

export async function analyzeBias(
  eventTopic: string,
  articles: { id: number; title: string; summary: string; source_name: string; source_category: string; region: string }[]
): Promise<BiasAnalysis> {
  const articlesContext = articles
    .map((a, i) => `[Source ${i + 1}] ${a.source_name} (${a.source_category}, ${a.region})\nHeadline: ${a.title}\nSummary: ${a.summary}`)
    .join("\n\n");

  const result = await chatCompletion(MODELS.quality, [
    {
      role: "system",
      content: `You are an expert media bias analyst. Analyze how different news sources cover the same event.
For each source, evaluate:
- bias_score: -1 (heavily biased/propaganda) to 1 (completely neutral/factual)
- propaganda_indicators: list of specific propaganda techniques used
- narrative_framing: brief description of how the source frames the event

Return JSON:
{
  "sources": [{"name": "", "category": "", "region": "", "headline": "", "bias_score": 0, "propaganda_indicators": [], "narrative_framing": ""}],
  "overall_assessment": "2-3 sentence comparison of coverage differences",
  "propaganda_index": 0-100
}`,
    },
    { role: "user", content: `Event/Topic: ${eventTopic}\n\nArticles:\n${articlesContext}` },
  ], { response_format: { type: "json_object" }, max_tokens: 4096 });

  const parsed = JSON.parse(result.choices[0]?.message?.content || "{}");
  const articleIds = articles.map((a) => a.id);

  await query(
    `INSERT INTO bias_analyses (event_topic, article_ids, analysis) VALUES ($1, $2, $3)`,
    [eventTopic, articleIds, JSON.stringify(parsed)]
  );

  return { event_topic: eventTopic, ...parsed };
}

export async function getRecentBiasAnalyses(limit: number = 10): Promise<BiasAnalysis[]> {
  const rows = await query(`SELECT * FROM bias_analyses ORDER BY created_at DESC LIMIT $1`, [limit]);
  return rows.map((row) => ({
    id: row.id,
    event_topic: row.event_topic,
    ...(typeof row.analysis === "string" ? JSON.parse(row.analysis) : row.analysis),
    created_at: row.created_at,
  }));
}
