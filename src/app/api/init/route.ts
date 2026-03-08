import { NextResponse } from "next/server";
import { initDB } from "@/lib/db";
import pool from "@/lib/db";

// Initialize database and seed default sources
export async function POST() {
  try {
    await initDB();

    // Seed some default sources if none exist
    const existing = await pool.query("SELECT COUNT(*) FROM sources");
    if (parseInt(existing.rows[0].count) === 0) {
      const defaultSources = [
        // Western
        { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews", region: "western", language: "en", category: "independent" },
        { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", region: "western", language: "en", category: "independent" },
        { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", region: "gulf", language: "en", category: "state-aligned" },
        // Russia
        { name: "TASS", url: "https://tass.com/rss/v2.xml", region: "russia", language: "en", category: "state" },
        { name: "RT", url: "https://www.rt.com/rss/news/", region: "russia", language: "en", category: "state" },
        // Middle East
        { name: "Press TV", url: "https://www.presstv.ir/RSS", region: "iran", language: "en", category: "state" },
        { name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", region: "israel", language: "en", category: "independent" },
        { name: "Jerusalem Post", url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", region: "israel", language: "en", category: "independent" },
        // Asia
        { name: "Xinhua", url: "http://www.xinhuanet.com/english/rss/worldrss.xml", region: "china", language: "en", category: "state" },
        { name: "Dawn", url: "https://www.dawn.com/feeds/home", region: "south_asia", language: "en", category: "independent" },
      ];

      for (const source of defaultSources) {
        await pool.query(
          `INSERT INTO sources (name, url, region, language, category)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (url) DO NOTHING`,
          [source.name, source.url, source.region, source.language, source.category]
        );
      }
    }

    return NextResponse.json({ message: "Database initialized and seeded successfully" });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json({ error: "Failed to initialize" }, { status: 500 });
  }
}
