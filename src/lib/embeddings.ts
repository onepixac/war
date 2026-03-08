// Simple embeddings using Groq's fast model to generate a text representation,
// then hash it to a fixed-size vector for pgvector similarity search.
// For production, swap with a real embedding model (e.g., HuggingFace Inference API).

export function textToVector(text: string, dimensions: number = 384): number[] {
  // Simple hash-based embedding for development
  // In production, replace with real embeddings (e.g., sentence-transformers via HF API)
  const vector: number[] = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (charCode * (i + 1)) % dimensions;
    vector[idx] += Math.sin(charCode * (i + 1) * 0.01);
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / magnitude);
}

export function vectorToSql(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
