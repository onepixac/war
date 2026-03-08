import { LLMAgent } from "llamaindex";
import { getQualityLLM } from "./config";
import { allTools, searchNewsTool, getRecentNewsTool, getAttacksTool, analyzeBiasTool, factCheckTool } from "./tools";

const INTEL_SYSTEM_PROMPT = `You are a senior geopolitical intelligence analyst. You have access to tools that let you:
- Search news articles by topic (semantic search)
- Get the latest news by region
- Get recent military/security incidents and attacks
- Analyze media bias across sources
- Fact-check claims against multiple sources

Guidelines:
- Always use your tools to gather information before answering
- Cite specific sources by name when making claims
- If you detect bias or single-source information, flag it
- Be neutral, factual, and analytical
- For broad questions, combine multiple tools (e.g., get attacks + search news)
- Provide structured, actionable intelligence briefings
- If you don't have enough data, say so honestly`;

// Main intelligence agent — used by the chat API
export async function runIntelAgent(message: string, history: { role: string; content: string }[] = []) {
  const llm = getQualityLLM();

  const intelAgent = new LLMAgent({
    llm,
    tools: allTools,
    systemPrompt: INTEL_SYSTEM_PROMPT,
  });

  const chatHistory = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  if (chatHistory.length > 0) {
    // Set chat history before calling
    for (const msg of chatHistory) {
      intelAgent.chatHistory.push({ role: msg.role, content: msg.content });
    }
  }

  const result = await intelAgent.chat({ message });
  return result.message.content;
}

// Bias analysis agent — specialized for comparing sources
export async function runBiasAgent(topic: string) {
  const llm = getQualityLLM();

  const biasAgent = new LLMAgent({
    llm,
    tools: [searchNewsTool, getRecentNewsTool, analyzeBiasTool],
    systemPrompt: `You are a media bias analyst. When given a topic:
1. First search for related articles using search_news
2. Then run analyze_bias on the topic
3. Provide a clear summary of how different sources frame the event
4. Identify any propaganda techniques or narrative manipulation
Be specific and cite actual sources.`,
  });

  const result = await biasAgent.chat({ message: topic });
  return result.message.content;
}

// Fact-check agent — specialized for claim verification
export async function runFactCheckAgent(claim: string) {
  const llm = getQualityLLM();

  const factAgent = new LLMAgent({
    llm,
    tools: [searchNewsTool, getAttacksTool, factCheckTool],
    systemPrompt: `You are a fact-checker. When given a claim:
1. First search for related articles using search_news
2. Also check recent attacks data if relevant
3. Run fact_check on the claim
4. Provide a clear verdict with evidence
Be thorough and cite specific sources.`,
  });

  const result = await factAgent.chat({ message: claim });
  return result.message.content;
}

// Situational briefing agent — for "what's happening" queries
export async function runBriefingAgent(query: string) {
  const llm = getQualityLLM();

  const briefingAgent = new LLMAgent({
    llm,
    tools: [getRecentNewsTool, getAttacksTool, searchNewsTool],
    systemPrompt: `You are a military intelligence briefing officer. When asked about the current situation:
1. Get recent attacks to understand the security landscape
2. Get recent news for context
3. Search for specific topics if relevant
4. Provide a structured briefing with:
   - Current threat level assessment
   - Key incidents in the last 24-48 hours
   - Regional breakdown if applicable
   - Notable escalations or de-escalations
Be concise and use bullet points.`,
  });

  const result = await briefingAgent.chat({ message: query });
  return result.message.content;
}
