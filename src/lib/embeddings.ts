// Real embeddings using your custom vLLM embedding server (All1eOnepix/embedding_model)
// Same model used in dati and slides projects, served on GPU M2

const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL || "http://213.171.186.218:8002/v1";
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || "";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "All1eOnepix/embedding_model";

export const EMBEDDING_DIMENSIONS = 1024;

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch(`${EMBEDDING_API_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(EMBEDDING_API_KEY ? { Authorization: `Bearer ${EMBEDDING_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000), // Limit input length
      }),
    });

    if (!res.ok) {
      console.error(`Embedding API error: ${res.status} ${res.statusText}`);
      return fallbackEmbedding(text);
    }

    const data = await res.json();
    return data.data[0].embedding;
  } catch (err) {
    console.error("Embedding API unreachable, using fallback:", err);
    return fallbackEmbedding(text);
  }
}

// Fallback: simple hash-based embedding when GPU server is unreachable
function fallbackEmbedding(text: string): number[] {
  const vector: number[] = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (charCode * (i + 1)) % EMBEDDING_DIMENSIONS;
    vector[idx] += Math.sin(charCode * (i + 1) * 0.01);
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

export function vectorToSql(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
