import { NextResponse } from "next/server";
import { initDB, query } from "@/lib/db";

export async function POST() {
  try {
    await initDB();

    // Reset and re-seed sources
    await query("DELETE FROM attacks");
    await query("DELETE FROM articles");
    await query("DELETE FROM sources");

    const defaultSources = [
      // Western
      { name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", region: "western", language: "en", category: "independent" },
      { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", region: "western", language: "en", category: "independent" },
      { name: "DW News", url: "https://rss.dw.com/rdf/rss-en-world", region: "western", language: "en", category: "independent" },
      { name: "ABC News Intl", url: "https://abcnews.go.com/abcnews/internationalheadlines", region: "western", language: "en", category: "independent" },
      // Middle East & Israel
      { name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", region: "israel", language: "en", category: "independent" },
      { name: "Anadolu Agency", url: "https://www.aa.com.tr/en/rss/default?cat=world", region: "turkey", language: "en", category: "state" },
      // Asia
      { name: "India Today", url: "https://www.indiatoday.in/rss/home", region: "south_asia", language: "en", category: "independent" },
      // Conflict-focused
      { name: "The Guardian Middle East", url: "https://www.theguardian.com/world/middleeast/rss", region: "middle_east", language: "en", category: "independent" },
      { name: "NPR Africa", url: "https://feeds.npr.org/1126/rss.xml", region: "western", language: "en", category: "independent" },
      { name: "DW Asia", url: "https://rss.dw.com/rdf/rss-en-asia", region: "china", language: "en", category: "independent" },
      { name: "The Guardian Ukraine", url: "https://www.theguardian.com/world/ukraine/rss", region: "russia", language: "en", category: "independent" },
      { name: "DW Europe", url: "https://rss.dw.com/rdf/rss-en-eu", region: "western", language: "en", category: "independent" },
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
