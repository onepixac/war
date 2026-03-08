import { NextRequest, NextResponse } from "next/server";
import { analyzeBias, getRecentBiasAnalyses } from "@/lib/services/bias";

export async function POST(request: NextRequest) {
  try {
    const { eventTopic, articles } = await request.json();

    if (!eventTopic || !articles?.length) {
      return NextResponse.json(
        { error: "eventTopic and articles are required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeBias(eventTopic, articles);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Bias API error:", error);
    return NextResponse.json({ error: "Failed to analyze bias" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const analyses = await getRecentBiasAnalyses();
    return NextResponse.json({ analyses });
  } catch (error) {
    console.error("Bias GET error:", error);
    return NextResponse.json({ error: "Failed to fetch analyses" }, { status: 500 });
  }
}
