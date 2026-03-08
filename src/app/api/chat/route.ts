import { NextRequest } from "next/server";
import { runIntelAgent } from "@/lib/llamaindex/agents";
import { searchArticles } from "@/lib/services/news";
import { groq, MODELS, rateLimiter } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get sources for the UI
    const articles = await searchArticles(message, 5);
    const sources = articles.map((a) => ({
      title: a.title,
      url: a.url,
      source_name: a.source_name || "Unknown",
    }));

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send sources first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`)
        );

        try {
          // Phase 1: Agent gathers intelligence via tools (non-streaming)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "status", content: "Gathering intelligence..." })}\n\n`)
          );

          const agentResult = await runIntelAgent(
            message,
            (history || []).slice(-10)
          );

          const agentText = typeof agentResult === "string" ? agentResult : String(agentResult);

          // Phase 2: Stream the refined response via Groq
          const stream = await rateLimiter.enqueue(MODELS.quality, () =>
            groq.chat.completions.create({
              model: MODELS.quality,
              messages: [
                {
                  role: "system",
                  content: `You are a geopolitical intelligence analyst. Rewrite the following intelligence briefing in clean markdown format. Use ## for section headers, **bold** for emphasis, and - for bullet points. Keep it concise and structured. Keep the same information and citations but improve readability. Do NOT add new information. Do NOT use asterisks for bullet points, only dashes.`,
                },
                {
                  role: "user",
                  content: `Intelligence briefing to reformat:\n\n${agentText}`,
                },
              ],
              temperature: 0.2,
              max_tokens: 2048,
              stream: true,
            })
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for await (const chunk of stream as any) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (err) {
          console.error("Chat error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`)
          );
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
