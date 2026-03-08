import { chatCompletion, MODELS } from "@/lib/groq";
import { query } from "@/lib/db";
import { textToVector, vectorToSql } from "@/lib/embeddings";

export interface Article {
  id: number;
  source_id: number;
  title: string;
  original_title: string | null;
  content: string | null;
  summary: string | null;
  url: string;
  language: string;
  region: string;
  published_at: string;
  fetched_at: string;
  source_name?: string;
  source_category?: string;
}

export interface Attack {
  id: number;
  article_id: number;
  attack_type: string;
  severity: string;
  location: string;
  lat: number;
  lon: number;
  description: string;
  classified_at: string;
  title?: string;
  summary?: string;
  source_name?: string;
}

export async function translateAndSummarize(
  title: string,
  content: string,
  language: string
): Promise<{ translatedTitle: string; summary: string }> {
  const isEnglish = language === "en";
  const prompt = isEnglish
    ? `Summarize this news article in 2-3 neutral sentences. Remove any propaganda or emotional language. Return JSON: {"title": "original title", "summary": "neutral summary"}\n\nTitle: ${title}\nContent: ${content?.slice(0, 3000) || title}`
    : `Translate and summarize this ${language} news article into English in 2-3 neutral sentences. Remove any propaganda or emotional language. Return JSON: {"title": "translated title", "summary": "neutral summary"}\n\nTitle: ${title}\nContent: ${content?.slice(0, 3000) || title}`;

  const result = await chatCompletion(MODELS.fast, [
    { role: "system", content: "You are a neutral news translator and summarizer. Always return valid JSON." },
    { role: "user", content: prompt },
  ], { response_format: { type: "json_object" } });

  try {
    const parsed = JSON.parse(result.choices[0]?.message?.content || "{}");
    return { translatedTitle: parsed.title || title, summary: parsed.summary || "" };
  } catch {
    return { translatedTitle: title, summary: "" };
  }
}

export async function classifyAttack(
  title: string,
  summary: string
): Promise<{ isAttack: boolean; type?: string; severity?: string; location?: string } | null> {
  const attackKeywords = /attack|strike|bomb|missile|shell|drone|kill|dead|casualt|explo|assault|raid|fire|shoot|clash/i;
  if (!attackKeywords.test(title) && !attackKeywords.test(summary)) return null;

  const result = await chatCompletion(MODELS.fast, [
    {
      role: "system",
      content: `You classify news articles about military/security events. Return JSON:
{"isAttack": boolean, "type": "airstrike|ground_attack|missile|drone|bombing|shelling|naval|cyber|other", "severity": "LOW|MEDIUM|HIGH|CRITICAL|MAJOR", "location": "city, country or region"}
If not a military/security event, return {"isAttack": false}.`,
    },
    { role: "user", content: `Title: ${title}\nSummary: ${summary}` },
  ], { response_format: { type: "json_object" } });

  try {
    return JSON.parse(result.choices[0]?.message?.content || "{}");
  } catch {
    return null;
  }
}

export async function geocode(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "User-Agent": "WarMonitor/1.0" } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (e) {
    console.error("Geocoding error:", e);
  }
  return null;
}

export async function saveArticle(article: {
  source_id: number;
  title: string;
  original_title?: string;
  content?: string;
  summary: string;
  url: string;
  language: string;
  region: string;
  published_at?: string;
}) {
  const embedding = textToVector(`${article.title} ${article.summary}`);
  const embeddingStr = vectorToSql(embedding);

  const rows = await query(
    `INSERT INTO articles (source_id, title, original_title, content, summary, url, language, region, published_at, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
     ON CONFLICT (url) DO UPDATE SET summary = $5, embedding = $10::vector
     RETURNING id`,
    [article.source_id, article.title, article.original_title || null, article.content || null,
     article.summary, article.url, article.language, article.region,
     article.published_at || new Date().toISOString(), embeddingStr]
  );
  return rows[0].id;
}

export async function searchArticles(queryText: string, limit: number = 10): Promise<Article[]> {
  const queryVector = textToVector(queryText);
  const embeddingStr = vectorToSql(queryVector);

  return await query(
    `SELECT a.*, s.name as source_name, s.category as source_category,
            1 - (a.embedding <=> $1::vector) as similarity
     FROM articles a
     LEFT JOIN sources s ON a.source_id = s.id
     WHERE a.embedding IS NOT NULL
     ORDER BY a.embedding <=> $1::vector
     LIMIT $2`,
    [embeddingStr, limit]
  ) as Article[];
}

export async function getRecentArticles(limit: number = 50, region?: string): Promise<Article[]> {
  if (region) {
    return await query(
      `SELECT a.*, s.name as source_name, s.category as source_category
       FROM articles a LEFT JOIN sources s ON a.source_id = s.id
       WHERE a.region = $1 ORDER BY a.fetched_at DESC LIMIT $2`,
      [region, limit]
    ) as Article[];
  }
  return await query(
    `SELECT a.*, s.name as source_name, s.category as source_category
     FROM articles a LEFT JOIN sources s ON a.source_id = s.id
     ORDER BY a.fetched_at DESC LIMIT $1`,
    [limit]
  ) as Article[];
}

export async function getAttacks(hours: number = 48): Promise<Attack[]> {
  return await query(
    `SELECT at.*, a.title, a.summary, a.url, s.name as source_name
     FROM attacks at
     JOIN articles a ON at.article_id = a.id
     LEFT JOIN sources s ON a.source_id = s.id
     WHERE at.classified_at > NOW() - make_interval(hours => $1)
       AND at.lat IS NOT NULL AND at.lon IS NOT NULL
     ORDER BY at.classified_at DESC`,
    [hours]
  ) as Attack[];
}
