import { NextRequest, NextResponse } from "next/server";
import { getRecentArticles } from "@/lib/services/news";

// GitHub raw URLs for NewFeeds project data
const NEWFEEDS_ATTACKS_URL = "https://raw.githubusercontent.com/ktoetotam/NewFeeds/main/data/attacks.json";
const NEWFEEDS_ARTICLES_BASE = "https://raw.githubusercontent.com/ktoetotam/NewFeeds/main/data/feeds";

const REGIONS = ["iran", "russia", "israel", "gulf", "proxies", "middle_east", "china", "turkey", "south_asia", "western"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") || "articles";
    const region = searchParams.get("region") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    if (type === "attacks") {
      // Fetch attacks directly from NewFeeds GitHub data
      const res = await fetch(NEWFEEDS_ATTACKS_URL, {
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!res.ok) {
        // Fallback to our own DB
        return NextResponse.json({ attacks: [] });
      }

      interface NewFeedsAttack {
        lat: number | null;
        lng: number | null;
        title_en: string | null;
        title_original: string;
        summary_en: string | null;
        source_name: string;
        source_category: string;
        region: string;
        classification: {
          is_attack?: boolean;
          category?: string;
          severity?: string;
          location?: string;
          brief?: string;
        } | null;
        fetched_at: string;
        url: string;
        id: string;
      }

      const rawAttacks: NewFeedsAttack[] = await res.json();

      // Transform to our format
      const attacks = rawAttacks
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          id: a.id,
          lat: a.lat,
          lon: a.lng,
          attack_type: a.classification?.category || "other",
          severity: (a.classification?.severity || "low").toUpperCase(),
          location: a.classification?.location || "Unknown",
          description: a.classification?.brief || a.summary_en || a.title_en || a.title_original,
          title: a.title_en || a.title_original,
          source_name: a.source_name,
          source_category: a.source_category,
          region: a.region,
          classified_at: a.fetched_at,
          url: a.url,
        }));

      return NextResponse.json({ attacks });
    }

    if (type === "newfeeds_articles") {
      // Fetch articles from NewFeeds GitHub data
      const targetRegions = region ? [region] : REGIONS;
      const allArticles = [];

      for (const r of targetRegions) {
        try {
          const res = await fetch(`${NEWFEEDS_ARTICLES_BASE}/${r}.json`, {
            next: { revalidate: 300 },
          });
          if (res.ok) {
            const articles = await res.json();
            allArticles.push(...articles.slice(0, Math.ceil(limit / targetRegions.length)));
          }
        } catch {
          // Skip unavailable regions
        }
      }

      return NextResponse.json({ articles: allArticles.slice(0, limit) });
    }

    // Default: our own DB articles
    const articles = await getRecentArticles(limit, region);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
