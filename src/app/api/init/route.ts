import { NextResponse } from "next/server";
import { initDB, query } from "@/lib/db";

export async function POST() {
  try {
    await initDB();

    // Reset and re-seed sources
    await query("DELETE FROM sources");

    const defaultSources = [
      // Western - reliable RSS feeds
      { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", region: "western", language: "en", category: "independent" },
      { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", region: "western", language: "en", category: "independent" },
      { name: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss", region: "western", language: "en", category: "independent" },
      { name: "DW News", url: "https://rss.dw.com/rdf/rss-en-world", region: "western", language: "en", category: "independent" },
      // Middle East
      { name: "Middle East Eye", url: "https://www.middleeasteye.net/rss", region: "middle_east", language: "en", category: "independent" },
      { name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", region: "israel", language: "en", category: "independent" },
      { name: "Al Monitor", url: "https://www.al-monitor.com/rss", region: "middle_east", language: "en", category: "independent" },
      // Asia
      { name: "South China Morning Post", url: "https://www.scmp.com/rss/91/feed", region: "china", language: "en", category: "independent" },
      { name: "Dawn Pakistan", url: "https://www.dawn.com/feeds/home", region: "south_asia", language: "en", category: "independent" },
      // Russia/Eurasia
      { name: "Moscow Times", url: "https://www.themoscowtimes.com/rss/news", region: "russia", language: "en", category: "independent" },
      // Turkey
      { name: "Daily Sabah", url: "https://www.dailysabah.com/rssFeed/home", region: "turkey", language: "en", category: "state-aligned" },
    ];

    for (const source of defaultSources) {
      await query(
        `INSERT INTO sources (name, url, region, language, category) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (url) DO NOTHING`,
        [source.name, source.url, source.region, source.language, source.category]
      );
    }

    return NextResponse.json({ message: "Database initialized and seeded successfully" });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
