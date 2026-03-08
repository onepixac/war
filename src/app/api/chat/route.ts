import { NextRequest, NextResponse } from "next/server";
import { chatWithNews } from "@/lib/services/chat";

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const result = await chatWithNews(message, history || []);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
