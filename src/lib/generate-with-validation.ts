import { NextResponse } from "next/server";
import { chatCompletion, AllModelsFailedError, type ChatMessage } from "@/lib/openrouter";
import { parseAIJson } from "@/lib/recommend-helpers";
import type { ValidationResult } from "@/types/fpl";

export class InvalidAIProposalError extends Error {
  constructor(public errors: string[]) {
    super(`AI proposal failed validation: ${errors.join("; ")}`);
  }
}

// Calls the AI, parses its JSON, and validates it. On a rule violation,
// re-prompts once with the specific violation so the model can self-correct
// (plan §5 — "re-prompt with the violation" rather than silently rejecting).
// Returns whether a retry was needed so the UI can show the "we caught and
// fixed one thing" banner.
export async function generateWithValidation<T>(
  messages: ChatMessage[],
  validate: (result: T) => ValidationResult,
): Promise<{ result: T; modelUsed: string; selfCorrected: boolean }> {
  let currentMessages = messages;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { modelUsed, content } = await chatCompletion(currentMessages, {
      responseFormat: "json_object",
    });

    let parsed: T;
    try {
      parsed = parseAIJson<T>(content);
    } catch (err) {
      console.log(`generateWithValidation: ${modelUsed} returned invalid JSON on attempt ${attempt}:`, err instanceof Error ? err.message : err, "content:", content.slice(0, 500));
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content },
        { role: "user", content: "That wasn't valid JSON. Respond with only the JSON object." },
      ];
      continue;
    }

    const validation = validate(parsed);
    if (validation.valid) {
      return { result: parsed, modelUsed, selfCorrected: attempt > 0 };
    }

    console.log(`generateWithValidation: ${modelUsed} failed rule validation on attempt ${attempt}:`, validation.errors);

    if (attempt === 0) {
      currentMessages = [
        ...currentMessages,
        { role: "assistant", content },
        {
          role: "user",
          content: `That proposal breaks FPL rules: ${validation.errors.join("; ")}. Send a corrected JSON object that fixes this.`,
        },
      ];
      continue;
    }

    throw new InvalidAIProposalError(validation.errors);
  }

  throw new InvalidAIProposalError(["AI did not return valid JSON after retrying"]);
}

// Shared error → HTTP response mapping for the three /api/recommend/* routes.
export function recommendationErrorResponse(err: unknown): NextResponse {
  if (err instanceof InvalidAIProposalError) {
    return NextResponse.json(
      { error: "AI couldn't produce a valid recommendation", details: err.errors },
      { status: 422 },
    );
  }
  if (err instanceof AllModelsFailedError) {
    return NextResponse.json(
      {
        error: "All AI models are currently busy or rate-limited. Please try again shortly.",
        attempts: err.attempts,
      },
      { status: 503 },
    );
  }
  throw err;
}
