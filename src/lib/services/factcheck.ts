import { chatCompletion, MODELS } from "@/lib/groq";
import { query } from "@/lib/db";
import { searchArticles } from "./news";

export interface FactCheck {
  id?: number;
  claim: string;
  confidence_score: number;
  verdict: string;
  evidence: {
    supporting: { source: string; excerpt: string }[];
    contradicting: { source: string; excerpt: string }[];
    missing_from: string[];
  };
  analysis: string;
  created_at?: string;
}

export async function factCheck(claim: string): Promise<FactCheck> {
  const relatedArticles = await searchArticles(claim, 15);

  if (relatedArticles.length === 0) {
    return {
      claim, confidence_score: 0, verdict: "UNVERIFIED",
      evidence: { supporting: [], contradicting: [], missing_from: [] },
      analysis: "No related articles found in the database to verify this claim.",
    };
  }

  const articlesContext = relatedArticles
    .map((a, i) => `[${i + 1}] ${a.source_name} (${a.source_category || "unknown"}, ${a.region})\nTitle: ${a.title}\nSummary: ${a.summary}`)
    .join("\n\n");

  const result = await chatCompletion(MODELS.quality, [
    {
      role: "system",
      content: `You are a fact-checker. Cross-reference a claim against multiple news sources.
Return JSON:
{
  "confidence_score": 0.0-1.0,
  "verdict": "CONFIRMED|LIKELY_TRUE|UNVERIFIED|DISPUTED|LIKELY_FALSE|FALSE",
  "evidence": {
    "supporting": [{"source": "name", "excerpt": "relevant text"}],
    "contradicting": [{"source": "name", "excerpt": "relevant text"}],
    "missing_from": ["source categories not covering this"]
  },
  "analysis": "2-3 sentence fact-check summary"
}`,
    },
    { role: "user", content: `Claim to verify: "${claim}"\n\nAvailable sources:\n${articlesContext}` },
  ], { response_format: { type: "json_object" }, max_tokens: 4096 });

  const parsed = JSON.parse(result.choices[0]?.message?.content || "{}");
  const articleIds = relatedArticles.map((a) => a.id);

  await query(
    `INSERT INTO fact_checks (claim, article_ids, confidence_score, verdict, evidence) VALUES ($1, $2, $3, $4, $5)`,
    [claim, articleIds, parsed.confidence_score, parsed.verdict, JSON.stringify(parsed.evidence)]
  );

  return { claim, ...parsed };
}

export async function getRecentFactChecks(limit: number = 10): Promise<FactCheck[]> {
  return await query(`SELECT * FROM fact_checks ORDER BY created_at DESC LIMIT $1`, [limit]) as FactCheck[];
}
