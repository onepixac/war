import { NextRequest, NextResponse } from "next/server";
import { getRecentArticles, getAttacks } from "@/lib/services/news";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") || "articles";
    const region = searchParams.get("region") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const hours = parseInt(searchParams.get("hours") || "48");

    if (type === "attacks") {
      const attacks = await getAttacks(hours);
      return NextResponse.json({ attacks });
    }

    const articles = await getRecentArticles(limit, region);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
