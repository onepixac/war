import { NextRequest, NextResponse } from "next/server";
import { runFactCheckAgent } from "@/lib/llamaindex/agents";
import { getRecentFactChecks } from "@/lib/services/factcheck";

export async function POST(request: NextRequest) {
  try {
    const { claim } = await request.json();

    if (!claim) {
      return NextResponse.json({ error: "Claim is required" }, { status: 400 });
    }

    // Use the LlamaIndex fact-check agent
    const agentResult = await runFactCheckAgent(claim);

    // Get the structured result that the agent's tool saved to DB
    const recent = await getRecentFactChecks(1);
    const structured = recent.length > 0 ? recent[0] : null;

    if (structured && structured.claim === claim) {
      return NextResponse.json({ ...structured, agent_analysis: agentResult });
    }

    // Fallback: return agent text
    return NextResponse.json({
      claim,
      confidence_score: 0,
      verdict: "UNVERIFIED",
      evidence: { supporting: [], contradicting: [], missing_from: [] },
      analysis: typeof agentResult === "string" ? agentResult : String(agentResult),
    });
  } catch (error) {
    console.error("Fact-check API error:", error);
    return NextResponse.json({ error: "Failed to fact-check" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const checks = await getRecentFactChecks();
    return NextResponse.json({ checks });
  } catch (error) {
    console.error("Fact-check GET error:", error);
    return NextResponse.json({ error: "Failed to fetch fact-checks" }, { status: 500 });
  }
}
