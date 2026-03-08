import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { chatCompletion, MODELS } from "@/lib/groq";
import { getEmbedding, vectorToSql } from "@/lib/embeddings";

export const maxDuration = 300; // 5 minutes for Vercel Pro, 60 for Hobby

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
            "User-Agent": "Mozilla/5.0 (compatible; WarMonitor/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
          },
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });

        if (!feedRes.ok) continue;
        const feedText = await feedRes.text();
        const items = parseRSSItems(feedText).slice(0, 8); // Process up to 8 items per feed

        for (const item of items) {
          if (!item.link || !item.title) continue;

          const existing = await query("SELECT id FROM articles WHERE url = $1", [item.link]);
          if (existing.length > 0) continue;

          // Single LLM call: translate + summarize + classify in one shot
          const result = await chatCompletion(MODELS.fast, [
            {
              role: "system",
              content: `You process news articles. Do ALL of these in ONE response as JSON:
1. If not English, translate the title to English
2. Write a 2-sentence neutral summary (remove propaganda)
3. Classify: is this about a military/security/conflict event?
4. If yes, provide location and severity

Return JSON:
{
  "title": "English title",
  "summary": "2 sentence neutral summary",
  "is_conflict": true/false,
  "conflict_type": "airstrike|missile|drone|bombing|shelling|ground_attack|naval|cyber|sanctions|protest|military_deployment|border_incident|humanitarian|other",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL|MAJOR",
  "location": "city, country"
}`,
            },
            {
              role: "user",
              content: `Title: ${item.title}\nContent: ${(item.description || "").slice(0, 2000)}`,
            },
          ], { response_format: { type: "json_object" } });

          let parsed;
          try {
            parsed = JSON.parse(result.choices[0]?.message?.content || "{}");
          } catch {
            continue;
          }

          const title = parsed.title || item.title;
          const summary = parsed.summary || "";

          // Get embedding
          const embedding = await getEmbedding(`${title} ${summary}`);

          // Save article
          const rows = await query(
            `INSERT INTO articles (source_id, title, original_title, content, summary, url, language, region, published_at, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
             ON CONFLICT (url) DO UPDATE SET summary = $5, embedding = $10::vector
             RETURNING id`,
            [source.id, title, source.language !== "en" ? item.title : null,
             item.description || null, summary, item.link, source.language,
             source.region, item.pubDate || new Date().toISOString(), vectorToSql(embedding)]
          );
          const articleId = rows[0].id;
          processed++;

          // If conflict event, geocode and save attack
          if (parsed.is_conflict && parsed.location) {
            try {
              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(parsed.location)}&format=json&limit=1`,
                { headers: { "User-Agent": "WarMonitor/1.0" }, signal: AbortSignal.timeout(5000) }
              );
              const geoData = await geoRes.json();
              if (geoData.length > 0) {
                await query(
                  `INSERT INTO attacks (article_id, attack_type, severity, location, lat, lon, description)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                  [articleId, parsed.conflict_type, parsed.severity, parsed.location,
                   parseFloat(geoData[0].lat), parseFloat(geoData[0].lon), summary]
                );
                attacks++;
              }
            } catch { /* geocode failed, skip */ }
          }
        }
      } catch (err) {
        const e = err as Error;
        errors.push(`${source.name}: ${e.message}`);
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
