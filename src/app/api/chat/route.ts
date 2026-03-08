import { NextRequest } from "next/server";
import { runIntelAgent } from "@/lib/llamaindex/agents";
import { searchArticles } from "@/lib/services/news";

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get sources for the UI (the agent will also search internally via tools)
    const articles = await searchArticles(message, 5);
    const sources = articles.map((a) => ({
      title: a.title,
      url: a.url,
      source_name: a.source_name || "Unknown",
    }));

    // Create SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send sources first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`)
        );

        try {
          // Run the LlamaIndex multi-tool agent
          const result = await runIntelAgent(
            message,
            (history || []).slice(-10)
          );

          // Send the full response as tokens (agent doesn't support streaming natively)
          const responseText = typeof result === "string" ? result : String(result);
          // Send in chunks to simulate streaming
          const chunkSize = 20;
          for (let i = 0; i < responseText.length; i += chunkSize) {
            const chunk = responseText.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`)
            );
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (err) {
          console.error("Agent error:", err);
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
