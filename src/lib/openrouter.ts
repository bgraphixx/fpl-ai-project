const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier OpenRouter models rotate and have tight per-model rate limits.
// Configure the fallback chain via OPENROUTER_MODELS (comma-separated model
// IDs, tried in order). Defaults verified live against
// https://openrouter.ai/api/v1/models on 2026-08-22, each test-driven with a
// realistic ~15-player JSON-mode prompt (not just a trivial "say OK") to
// confirm they actually follow the requested schema — several free models
// return 200 with garbage or truncated JSON under load, which a liveness
// check alone won't catch. Re-verify at
// https://openrouter.ai/models?max_price=0 if these start failing.
const DEFAULT_MODELS = [
  "liquid/lfm-2.5-2.6b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
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

export type ModelAttempt = {
  model: string;
  status: "ok" | "rate-limited" | "error" | "empty" | "timeout";
  detail: string;
  latencyMs: number;
};

export class AllModelsFailedError extends Error {
  constructor(public attempts: ModelAttempt[]) {
    const last = attempts[attempts.length - 1];
    super(
      `All models in the fallback chain failed or are rate-limited. Last: ${last?.model} (${last?.status}) ${last?.detail}`,
    );
  }
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type OpenRouterResult = {
  modelUsed: string;
  content: string;
  attempts: ModelAttempt[];
};

// Live testing showed free models fail in ways a liveness check won't catch
// — some sit queued for the full timeout before failing, unpredictably.
// Trying models one at a time (up to N × timeout) made worst-case latency
// several minutes. Racing them in parallel instead means one stuck model
// can't block a fast one from winning, and caps total wait to roughly one
// timeout window regardless of chain length.
const PER_MODEL_TIMEOUT_MS = 45_000;

async function callModel(
  model: string,
  messages: ChatMessage[],
  options: { responseFormat?: "json_object" },
  apiKey: string,
  signal: AbortSignal,
): Promise<{ ok: true; result: OpenRouterResult } | { ok: false; attempt: ModelAttempt }> {
  const startedAt = Date.now();
  console.log(`OpenRouter: trying ${model}…`);

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
      signal,
    });
    const latencyMs = Date.now() - startedAt;

    if (res.status === 429) {
      console.log(`OpenRouter: ${model} rate-limited (429) after ${latencyMs}ms`);
      return { ok: false, attempt: { model, status: "rate-limited", detail: "429", latencyMs } };
    }
    if (!res.ok) {
      const body = await res.text();
      console.log(`OpenRouter: ${model} error ${res.status} after ${latencyMs}ms`);
      return {
        ok: false,
        attempt: { model, status: "error", detail: `${res.status}: ${body.slice(0, 200)}`, latencyMs },
      };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.log(`OpenRouter: ${model} returned no content after ${latencyMs}ms`);
      return { ok: false, attempt: { model, status: "empty", detail: "no content in response", latencyMs } };
    }

    console.log(`OpenRouter: ${model} succeeded in ${latencyMs}ms (${content.length} chars)`);
    return {
      ok: true,
      result: {
        modelUsed: model,
        content,
        attempts: [{ model, status: "ok", detail: `${content.length} chars`, latencyMs }],
      },
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort) {
      // Cancelled either because another model already won, or because the
      // overall timeout fired — either way not worth a loud log line.
      return { ok: false, attempt: { model, status: "timeout", detail: "cancelled", latencyMs } };
    }
    console.log(
      `OpenRouter: ${model} ${isTimeout ? "timed out" : "failed"} after ${latencyMs}ms — ${err instanceof Error ? err.message : err}`,
    );
    return {
      ok: false,
      attempt: {
        model,
        status: isTimeout ? "timeout" : "error",
        detail: err instanceof Error ? err.message : String(err),
        latencyMs,
      },
    };
  }
}

// Races every model in the fallback chain concurrently and returns whichever
// succeeds first, cancelling the rest. Throws only if all of them fail,
// carrying per-model attempt diagnostics so failures are debuggable instead
// of a bare "something went wrong".
export async function chatCompletion(
  messages: ChatMessage[],
  options: { responseFormat?: "json_object" } = {},
): Promise<OpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const models = getModelChain();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);

  try {
    const attempts: ModelAttempt[] = [];
    let remaining = models.length;

    const winner = await new Promise<OpenRouterResult | null>((resolve) => {
      let settled = false;
      for (const model of models) {
        callModel(model, messages, options, apiKey, controller.signal).then((r) => {
          remaining--;
          attempts.push(r.ok ? r.result.attempts[0] : r.attempt);
          if (r.ok && !settled) {
            settled = true;
            resolve(r.result);
          } else if (remaining === 0 && !settled) {
            settled = true;
            resolve(null);
          }
        });
      }
    });

    if (winner) {
      controller.abort(); // cancel any still-running losers
      return { ...winner, attempts };
    }

    console.error("OpenRouter: all models failed", attempts);
    throw new AllModelsFailedError(attempts);
  } finally {
    clearTimeout(timeoutId);
  }
}
