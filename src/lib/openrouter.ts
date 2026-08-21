const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier OpenRouter models rotate and have tight per-model rate limits.
// Configure the fallback chain via OPENROUTER_MODELS (comma-separated model
// IDs, tried in order). Defaults verified live against
// https://openrouter.ai/api/v1/models on 2026-08-21 — the free lineup
// rotates, so re-verify at https://openrouter.ai/models?max_price=0 if
// these start 404ing.
const DEFAULT_MODELS = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "z-ai/glm-5.2:free",
];

function getModelChain(): string[] {
  const configured = process.env.OPENROUTER_MODELS;
  if (!configured) return DEFAULT_MODELS;
  return configured
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

export class AllModelsFailedError extends Error {
  constructor(lastError: string) {
    super(
      `All models in the fallback chain failed or are rate-limited. Last error: ${lastError}`,
    );
  }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type OpenRouterResult = {
  modelUsed: string;
  content: string;
};

// Free reasoning models can legitimately take 30-40s on a large prompt (a
// full player-pool candidate list), so the timeout needs real headroom —
// but still caps a stuck/queued model so the fallback chain can move on.
const PER_MODEL_TIMEOUT_MS = 55_000;

// Tries each model in the fallback chain in order, moving to the next on a
// 429 (rate limit), 5xx error, or timeout. Throws if every model fails.
export async function chatCompletion(
  messages: ChatMessage[],
  options: { responseFormat?: "json_object" } = {},
): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const models = getModelChain();
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          ...(options.responseFormat === "json_object"
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
        signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${model} returned ${res.status}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${model} returned ${res.status}: ${body}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new Error(`${model} returned no content`);
        continue;
      }

      return { modelUsed: model, content };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new AllModelsFailedError(lastError?.message ?? "unknown");
}
