import { NextRequest } from "next/server";
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

    // 1. Retrieve relevant articles
    const articles = await searchArticles(message, 8);

    const context = articles.length > 0
      ? articles
          .map(
            (a, i) =>
              `[${i + 1}] ${a.source_name} (${a.region}) - ${a.title}\n${a.summary}\nURL: ${a.url}`
          )
          .join("\n\n")
      : "No relevant articles found in the database.";

    const sources = articles.slice(0, 5).map((a) => ({
      title: a.title,
      url: a.url,
      source_name: a.source_name || "Unknown",
    }));

    const messages = [
      {
        role: "system" as const,
        content: `You are a geopolitical analyst assistant. Answer questions about global conflicts and security events based ONLY on the provided news articles.

Rules:
- Base your answers on the provided sources only
- Cite sources by number [1], [2], etc.
- If information is from a single source type (e.g., only state media), mention this caveat
- Be neutral and factual
- If you don't have enough information, say so

Available news articles:
${context}`,
      },
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // 2. Stream response
    const stream = await rateLimiter.enqueue(MODELS.quality, () =>
      groq.chat.completions.create({
        model: MODELS.quality,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      })
    );

    // Create SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send sources first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`)
        );

        try {
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
