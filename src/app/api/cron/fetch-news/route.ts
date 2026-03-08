import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { translateAndSummarize, classifyAttack, geocode, saveArticle } from "@/lib/services/news";

export const maxDuration = 60; // Vercel function timeout: 60 seconds

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sources = await query("SELECT * FROM sources WHERE active = true ORDER BY region");

    if (sources.length === 0) {
      return NextResponse.json({ message: "No active sources configured" });
    }

    let processed = 0;
    let attacks = 0;
    const errors: string[] = [];

    for (const source of sources) {
      try {
        const feedRes = await fetch(source.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WarMonitor/1.0; +https://war-pied-two.vercel.app)",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
          },
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        });

        if (!feedRes.ok) continue;
        const feedText = await feedRes.text();
        const items = parseRSSItems(feedText).slice(0, 5);

        for (const item of items) {
          const existing = await query("SELECT id FROM articles WHERE url = $1", [item.link]);
          if (existing.length > 0) continue;

          const { translatedTitle, summary } = await translateAndSummarize(
            item.title, item.description || "", source.language
          );

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

          const classification = await classifyAttack(translatedTitle, summary);
          if (classification?.isAttack && classification.location) {
            const coords = await geocode(classification.location);
            if (coords) {
              await query(
                `INSERT INTO attacks (article_id, attack_type, severity, location, lat, lon, description) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [articleId, classification.type, classification.severity, classification.location, coords.lat, coords.lon, summary]
              );
              attacks++;
            }
          }
        }
      } catch (err) {
        errors.push(`${source.name}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({ processed, attacks, sources: sources.length, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json({ error: "Pipeline failed" }, { status: 500 });
  }
}

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
    items.push({ title: getTag("title"), link: getTag("link"), description: getTag("description"), pubDate: getTag("pubDate") });
  }
  return items;
}
