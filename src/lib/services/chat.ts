import { chatCompletion, MODELS } from "@/lib/groq";
import { searchArticles } from "./news";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithNews(
  message: string,
  history: ChatMessage[] = []
): Promise<{ reply: string; sources: { title: string; url: string; source_name: string }[] }> {
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

  // 2. Generate response with RAG context
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
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  const result = await chatCompletion(MODELS.quality, messages, { max_tokens: 2048 });

  const reply = result.choices[0]?.message?.content || "I couldn't generate a response.";

  const sources = articles.slice(0, 5).map((a) => ({
    title: a.title,
    url: a.url,
    source_name: a.source_name || "Unknown",
  }));

  return { reply, sources };
}
