import { NextRequest } from "next/server";
import { runIntelAgent } from "@/lib/llamaindex/agents";
import { searchArticles } from "@/lib/services/news";
import { groq, MODELS, rateLimiter } from "@/lib/groq";
import { FaithfulnessEvaluator } from "llamaindex/evaluation";
import { initSettings } from "@/lib/llamaindex/config";

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
    const articles = await searchArticles(message, 8);
    const sources = articles.map((a) => ({
      title: a.title,
      url: a.url,
      source_name: a.source_name || "Unknown",
    }));

    // Build context from actual source articles for faithfulness check
    const sourceContext = articles
      .map((a) => `[${a.source_name}] ${a.title}: ${a.summary || ""}`)
      .join("\n\n");

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

          // Phase 2: Faithfulness evaluation — check agent output against real sources
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "status", content: "Verifying against sources..." })}\n\n`)
          );

          initSettings(); // Required for evaluator to use LLM
          const evaluator = new FaithfulnessEvaluator();

          let verifiedText = agentText;
          let faithfulnessScore = 1;

          try {
            const evalResult = await evaluator.evaluate({
              query: message,
              response: agentText,
              contexts: [sourceContext],
            });

            faithfulnessScore = evalResult.score ?? 1;

            if (faithfulnessScore < 0.5 && sourceContext.length > 50) {
              // Low faithfulness: regenerate grounded response directly from sources
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "status", content: "Re-grounding response..." })}\n\n`)
              );

              const groundedResult = await rateLimiter.enqueue(MODELS.quality, () =>
                groq.chat.completions.create({
                  model: MODELS.quality,
                  messages: [
                    {
                      role: "system",
                      content: `You are a geopolitical intelligence analyst. Answer the user's question using ONLY the source articles provided below. Do NOT add any information that is not in the sources. If the sources don't cover something, say "No data available from current sources." Cite the source name for every claim.`,
                    },
                    {
                      role: "user",
                      content: `Question: ${message}\n\nSource articles:\n${sourceContext}`,
                    },
                  ],
                  temperature: 0.1,
                  max_tokens: 2048,
                })
              );

              verifiedText = groundedResult.choices[0]?.message?.content || agentText;
            }
          } catch (evalErr) {
            console.error("Faithfulness eval error (continuing with agent text):", evalErr);
            // Continue with agent text if evaluator fails
          }

          // Phase 3: Stream the formatted response via Groq
          const stream = await rateLimiter.enqueue(MODELS.quality, () =>
            groq.chat.completions.create({
              model: MODELS.quality,
              messages: [
                {
                  role: "system",
                  content: `You are a geopolitical intelligence analyst. Rewrite the following intelligence briefing in clean markdown format. Use ## for section headers, **bold** for emphasis, and - for bullet points. Keep it concise and structured. Keep the same information and citations but improve readability. Do NOT add new information beyond what is provided. Do NOT use asterisks for bullet points, only dashes.${
                    faithfulnessScore < 0.7
                      ? "\n\nIMPORTANT: Add a note at the end: '---\n*Faithfulness score: " + Math.round(faithfulnessScore * 100) + "/100 — some claims may need independent verification.*'"
                      : ""
                  }`,
                },
                {
                  role: "user",
                  content: `Intelligence briefing to reformat:\n\n${verifiedText}`,
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
