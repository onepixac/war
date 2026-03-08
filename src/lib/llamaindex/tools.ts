import { tool } from "llamaindex";
import { z } from "zod";
import { searchArticles, getAttacks, getRecentArticles } from "@/lib/services/news";
import { analyzeBias } from "@/lib/services/bias";
import { factCheck } from "@/lib/services/factcheck";

export const searchNewsTool = tool({
  name: "search_news",
  description: "Search for news articles related to a topic using semantic vector search. Returns the most relevant articles from the database.",
  parameters: z.object({
    query: z.string().describe("The search query about a conflict, event, or geopolitical topic"),
  }),
  execute: async ({ query }) => {
    const articles = await searchArticles(query, 10);
    if (articles.length === 0) return "No relevant articles found in the database.";
    return articles
      .map((a, i) => `[${i + 1}] ${a.source_name} (${a.region}) - ${a.title}\nSummary: ${a.summary}\nURL: ${a.url}`)
      .join("\n\n");
  },
});

export const getRecentNewsTool = tool({
  name: "get_recent_news",
  description: "Get the most recent news articles, optionally filtered by region. Use this to see what's happening right now.",
  parameters: z.object({
    region: z.string().optional().describe("Filter by region: iran, russia, israel, gulf, middle_east, china, turkey, south_asia, western. Leave empty for all regions."),
  }),
  execute: async ({ region }) => {
    const articles = await getRecentArticles(15, region);
    if (articles.length === 0) return "No recent articles found.";
    return articles
      .map((a, i) => `[${i + 1}] ${a.source_name} (${a.source_category}, ${a.region}) - ${a.title}\n${a.summary}`)
      .join("\n\n");
  },
});

export const getAttacksTool = tool({
  name: "get_attacks",
  description: "Get recent military/security incidents and attacks from the last 7 days with their locations, severity, and types. Useful for answering questions about ongoing conflicts.",
  parameters: z.object({
    query: z.string().optional().describe("Optional context about what kind of attacks to focus on"),
  }),
  execute: async () => {
    const attacks = await getAttacks(168);
    if (attacks.length === 0) return "No attacks found in the last 7 days.";

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    attacks.forEach((a) => {
      const sev = a.severity?.split("|")[0]?.trim()?.toUpperCase() || "LOW";
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
      const type = a.attack_type?.split("|")[0]?.trim() || "other";
      byType[type] = (byType[type] || 0) + 1;
    });

    let summary = `Found ${attacks.length} incidents in the last 7 days.\n`;
    summary += `By severity: ${Object.entries(bySeverity).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`;
    summary += `By type: ${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(", ")}\n\n`;
    summary += "Recent incidents:\n";
    summary += attacks.slice(0, 20)
      .map((a, i) => `[${i + 1}] ${a.location} — ${a.severity} ${a.attack_type}: ${a.description || a.title}`)
      .join("\n");

    return summary;
  },
});

export const analyzeBiasTool = tool({
  name: "analyze_bias",
  description: "Analyze media bias for a specific topic by comparing how different news sources cover the same event. Returns bias scores, propaganda indicators, and narrative framing analysis.",
  parameters: z.object({
    topic: z.string().describe("The event or topic to analyze bias for"),
  }),
  execute: async ({ topic }) => {
    const articles = await searchArticles(topic, 10);
    if (articles.length < 2) return "Not enough articles found to perform bias analysis. Need at least 2 different sources.";

    const articleData = articles.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || "",
      source_name: a.source_name || "Unknown",
      source_category: a.source_category || "unknown",
      region: a.region || "unknown",
    }));

    const result = await analyzeBias(topic, articleData);

    let response = `Bias Analysis for: ${topic}\n`;
    response += `Propaganda Index: ${result.propaganda_index}/100\n`;
    response += `Overall: ${result.overall_assessment}\n\n`;
    if (result.sources) {
      response += result.sources
        .map((s) => `${s.name} (bias: ${s.bias_score > 0 ? "+" : ""}${s.bias_score.toFixed(1)}): ${s.narrative_framing}`)
        .join("\n");
    }
    return response;
  },
});

export const factCheckTool = tool({
  name: "fact_check",
  description: "Verify a claim by cross-referencing it against multiple news sources. Returns a verdict (CONFIRMED, LIKELY_TRUE, UNVERIFIED, DISPUTED, LIKELY_FALSE, FALSE) with supporting and contradicting evidence.",
  parameters: z.object({
    claim: z.string().describe("The claim to verify"),
  }),
  execute: async ({ claim }) => {
    const result = await factCheck(claim);

    let response = `Fact Check: "${claim}"\n`;
    response += `Verdict: ${result.verdict} (${Math.round((result.confidence_score || 0) * 100)}% confidence)\n`;
    response += `Analysis: ${result.analysis}\n`;
    if (result.evidence?.supporting?.length > 0) {
      response += `\nSupporting: ${result.evidence.supporting.map((e) => `${e.source}: ${e.excerpt}`).join("; ")}`;
    }
    if (result.evidence?.contradicting?.length > 0) {
      response += `\nContradicting: ${result.evidence.contradicting.map((e) => `${e.source}: ${e.excerpt}`).join("; ")}`;
    }
    return response;
  },
});

export const allTools = [
  searchNewsTool,
  getRecentNewsTool,
  getAttacksTool,
  analyzeBiasTool,
  factCheckTool,
];
