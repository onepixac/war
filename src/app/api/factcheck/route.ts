import { NextRequest, NextResponse } from "next/server";
import { factCheck, getRecentFactChecks } from "@/lib/services/factcheck";

export async function POST(request: NextRequest) {
  try {
    const { claim } = await request.json();

    if (!claim) {
      return NextResponse.json({ error: "Claim is required" }, { status: 400 });
    }

    const result = await factCheck(claim);
    return NextResponse.json(result);
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
