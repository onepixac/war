import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { translateAndSummarize, classifyAttack, geocode, saveArticle } from "@/lib/services/news";

// Vercel Cron job: fetch news from RSS sources
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/fetch-news", "schedule": "*/30 * * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get active sources
    const sourcesResult = await pool.query(
      "SELECT * FROM sources WHERE active = true ORDER BY region"
    );
    const sources = sourcesResult.rows;

    if (sources.length === 0) {
      return NextResponse.json({ message: "No active sources configured" });
    }

    let processed = 0;
    let attacks = 0;
    const errors: string[] = [];

    for (const source of sources) {
      try {
        // Fetch RSS feed
        const feedRes = await fetch(source.url, {
          headers: { "User-Agent": "WarMonitor/1.0" },
          signal: AbortSignal.timeout(10000),
        });

        if (!feedRes.ok) continue;

        const feedText = await feedRes.text();

        // Simple RSS parsing (extract items)
        const items = parseRSSItems(feedText).slice(0, 5); // Limit per source

        for (const item of items) {
          // Check if already exists
          const existing = await pool.query(
            "SELECT id FROM articles WHERE url = $1",
            [item.link]
          );
          if (existing.rows.length > 0) continue;

          // Translate and summarize
          const { translatedTitle, summary } = await translateAndSummarize(
            item.title,
            item.description || "",
            source.language
          );

          // Save article
          const articleId = await saveArticle({
            source_id: source.id,
            title: translatedTitle,
            original_title: source.language !== "en" ? item.title : undefined,
            content: item.description,
            summary,
            url: item.link,
            language: source.language,
            region: source.region,
            published_at: item.pubDate,
          });

          processed++;

          // Classify as attack
          const classification = await classifyAttack(translatedTitle, summary);
          if (classification?.isAttack && classification.location) {
            const coords = await geocode(classification.location);
            if (coords) {
              await pool.query(
                `INSERT INTO attacks (article_id, attack_type, severity, location, lat, lon, description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  articleId,
                  classification.type,
                  classification.severity,
                  classification.location,
                  coords.lat,
                  coords.lon,
                  summary,
                ]
              );
              attacks++;
            }
          }
        }
      } catch (err) {
        errors.push(`${source.name}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      processed,
      attacks,
      sources: sources.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json({ error: "Pipeline failed" }, { status: 500 });
  }
}

// Simple RSS parser (no external dependency)
function parseRSSItems(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  const items: { title: string; link: string; description: string; pubDate: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const getTag = (tag: string) => {
      const tagMatch = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return (tagMatch?.[1] || tagMatch?.[2] || "").trim();
    };

    items.push({
      title: getTag("title"),
      link: getTag("link"),
      description: getTag("description"),
      pubDate: getTag("pubDate"),
    });
  }

  return items;
}
