import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Models optimized for free tier rate limits
export const MODELS = {
  // 14.4K RPD, 500K TPD, 6K TPM — best for high-volume bulk tasks
  fast: "llama-3.1-8b-instant" as const,
  // 30K TPM, 500K TPD, 1K RPD — best for quality analysis
  quality: "meta-llama/llama-4-scout-17b-16e-instruct" as const,
};

// Rate limits per model (free tier)
const RATE_LIMITS: Record<string, { rpm: number; rpd: number; tpm: number }> = {
  [MODELS.fast]: { rpm: 30, rpd: 14400, tpm: 6000 },
  [MODELS.quality]: { rpm: 30, rpd: 1000, tpm: 30000 },
};

// --- Rate Limiter with Queue + Exponential Backoff ---

interface QueueItem {
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  model: string;
}

class RateLimiter {
  private queues: Map<string, QueueItem[]> = new Map();
  private processing: Map<string, boolean> = new Map();
  private requestTimestamps: Map<string, number[]> = new Map();
  private dailyRequests: Map<string, number> = new Map();
  private dailyResetTime: number = Date.now();

  async enqueue<T>(model: string, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queue = this.queues.get(model) || [];
      queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        model,
      });
      this.queues.set(model, queue);
      this.processQueue(model);
    });
  }

  private async processQueue(model: string): Promise<void> {
    if (this.processing.get(model)) return;
    this.processing.set(model, true);

    const queue = this.queues.get(model) || [];

    while (queue.length > 0) {
      const item = queue[0];
      const limits = RATE_LIMITS[model] || RATE_LIMITS[MODELS.fast];

      // Check daily reset
      if (Date.now() - this.dailyResetTime > 86400000) {
        this.dailyRequests.clear();
        this.dailyResetTime = Date.now();
      }

      // Check daily limit
      const dailyCount = this.dailyRequests.get(model) || 0;
      if (dailyCount >= limits.rpd) {
        console.warn(`[RateLimiter] Daily limit reached for ${model} (${dailyCount}/${limits.rpd})`);
        // Reject remaining items
        while (queue.length > 0) {
          const rejected = queue.shift()!;
          rejected.reject(new Error(`Daily rate limit reached for ${model}`));
        }
        break;
      }

      // Check per-minute limit
      const now = Date.now();
      const timestamps = this.requestTimestamps.get(model) || [];
      const recentTimestamps = timestamps.filter((t) => now - t < 60000);
      this.requestTimestamps.set(model, recentTimestamps);

      if (recentTimestamps.length >= limits.rpm) {
        const oldestInWindow = recentTimestamps[0];
        const waitTime = 60000 - (now - oldestInWindow) + 100; // +100ms buffer
        await sleep(waitTime);
        continue; // Re-check after waiting
      }

      // Execute with retry + exponential backoff
      queue.shift();
      let attempt = 0;
      const maxAttempts = 5;

      while (attempt < maxAttempts) {
        try {
          recentTimestamps.push(Date.now());
          this.requestTimestamps.set(model, recentTimestamps);
          this.dailyRequests.set(model, (this.dailyRequests.get(model) || 0) + 1);

          const result = await item.execute();
          item.resolve(result);
          break;
        } catch (error: unknown) {
          const err = error as { status?: number; headers?: { get?: (key: string) => string | null } };
          if (err.status === 429) {
            attempt++;
            const retryAfter = err.headers?.get?.("retry-after");
            const backoff = retryAfter
              ? parseInt(retryAfter) * 1000
              : Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 60000);
            console.warn(`[RateLimiter] 429 for ${model}, retry ${attempt}/${maxAttempts} in ${backoff}ms`);
            await sleep(backoff);
          } else {
            item.reject(error);
            break;
          }
        }

        if (attempt >= maxAttempts) {
          item.reject(new Error(`Max retries exceeded for ${model}`));
        }
      }
    }

    this.processing.set(model, false);
  }

  getStats(model: string) {
    const daily = this.dailyRequests.get(model) || 0;
    const limits = RATE_LIMITS[model] || RATE_LIMITS[MODELS.fast];
    const queueLength = (this.queues.get(model) || []).length;
    return { daily, dailyLimit: limits.rpd, queueLength };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const rateLimiter = new RateLimiter();

// Convenience: call Groq with rate limiting
export async function chatCompletion(
  model: string,
  messages: Groq.Chat.ChatCompletionMessageParam[],
  options?: { temperature?: number; max_tokens?: number; response_format?: { type: string } }
) {
  return rateLimiter.enqueue(model, () =>
    groq.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.max_tokens ?? 2048,
      ...(options?.response_format ? { response_format: options.response_format as { type: "json_object" } } : {}),
    })
  );
}
