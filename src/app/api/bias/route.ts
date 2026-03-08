import { NextRequest, NextResponse } from "next/server";
import { runBiasAgent } from "@/lib/llamaindex/agents";
import { getRecentBiasAnalyses } from "@/lib/services/bias";

export async function POST(request: NextRequest) {
  try {
    const { eventTopic } = await request.json();

    if (!eventTopic) {
      return NextResponse.json(
        { error: "eventTopic is required" },
        { status: 400 }
      );
    }

    // Use the LlamaIndex bias agent
    const agentResult = await runBiasAgent(eventTopic);

    // The agent returns a text analysis; also get the structured data from DB
    const recent = await getRecentBiasAnalyses(1);
    const structured = recent.length > 0 ? recent[0] : null;

    if (structured && structured.event_topic === eventTopic) {
      return NextResponse.json({ ...structured, agent_analysis: agentResult });
    }

    // Return agent-only response if no structured data
    return NextResponse.json({
      event_topic: eventTopic,
      overall_assessment: typeof agentResult === "string" ? agentResult : String(agentResult),
      propaganda_index: 0,
      sources: [],
    });
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
