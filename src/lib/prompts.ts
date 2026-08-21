import type { ChatMessage } from "@/lib/openrouter";
import type { PlayerSignal } from "@/lib/signals";

const SYSTEM_PROMPT =
  "You are an FPL (Fantasy Premier League) assistant. You reason over the " +
  "provided player signals (fixture difficulty, form, injury news, expected " +
  "stats, price trend, ownership) and propose a recommendation. Squad rule " +
  "validation happens outside of you — propose the best team you can, but " +
  "your proposal will be rejected and you may be re-prompted if it breaks " +
  "FPL rules (15-man squad: 2 GK/5 DEF/5 MID/3 FWD, max 3 players per club, " +
  "budget limits). Always respond with a single JSON object, no prose " +
  "outside the JSON, no markdown code fences.";

export function buildXIPrompt(squadSignals: PlayerSignal[]): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        "Given this 15-man squad, pick the best starting XI, formation, captain, " +
        "and vice-captain for the upcoming gameweek.\n\n" +
        `Squad:\n${JSON.stringify(squadSignals, null, 2)}\n\n` +
        "Respond with JSON matching exactly this shape:\n" +
        `{
  "startingXI": [<11 player ids>],
  "bench": [<4 player ids, ordered by preference>],
  "formation": "<e.g. 3-4-3>",
  "captainId": <player id>,
  "viceCaptainId": <player id>,
  "summary": "<1 sentence overall recommendation>",
  "detail": "<2-3 sentences of reasoning, no more>",
  "perPlayer": [{ "id": <player id, starting XI only>, "summary": "<one short line>", "detail": "<1-2 sentences, no more>" }]
}
Be concise — short, punchy reasoning, not essays.`,
    },
  ];
}

export function buildTransferPrompt(
  squadSignals: PlayerSignal[],
  candidateSignals: PlayerSignal[],
  freeTransfers: number,
  bank: number,
  allowHits: boolean,
): ChatMessage[] {
  const hitPolicy = allowHits
    ? "Only suggest a hit (-4 pts per transfer beyond the free allowance) if you can justify it's worth it."
    : `The user does not want to take a hit — make at most ${freeTransfers} transfer(s), never more.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `The user has ${freeTransfers} free transfer(s) and £${bank}m in the bank. ` +
        "Suggest transfers in/out from the current squad, choosing replacements from " +
        `the candidate pool. ${hitPolicy}\n\n` +
        `Current squad:\n${JSON.stringify(squadSignals, null, 2)}\n\n` +
        `Candidate pool:\n${JSON.stringify(candidateSignals, null, 2)}\n\n` +
        "Respond with JSON matching exactly this shape:\n" +
        `{
  "transfersOut": [<player ids to sell>],
  "transfersIn": [<player ids to buy, same order/length as transfersOut>],
  "transfersMade": <integer>,
  "hitWorthIt": <boolean, true only if transfersMade > freeTransfers>,
  "summary": "<1 sentence overall recommendation>",
  "detail": "<2-3 sentences, including why any hit is worth it>",
  "perPlayer": [{ "id": <incoming player id only>, "summary": "<one short line>", "detail": "<1-2 sentences, no more>" }]
}
Be concise — short, punchy reasoning, not essays.`,
    },
  ];
}

export function buildSquadPrompt(candidateSignals: PlayerSignal[], budget: number): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `Build a complete 15-man squad from scratch within a £${budget}m budget ` +
        "(2 GK, 5 DEF, 5 MID, 3 FWD, max 3 players per club), then pick a starting " +
        "XI, formation, captain, and vice-captain from within it.\n\n" +
        `Candidate pool:\n${JSON.stringify(candidateSignals, null, 2)}\n\n` +
        "Respond with JSON matching exactly this shape:\n" +
        `{
  "squad": [<15 player ids>],
  "startingXI": [<11 player ids>],
  "formation": "<e.g. 3-4-3>",
  "captainId": <player id>,
  "viceCaptainId": <player id>,
  "summary": "<1 sentence overall recommendation>",
  "detail": "<2-3 sentences of reasoning, no more>",
  "perPlayer": [{ "id": <player id, starting XI only>, "summary": "<one short line>", "detail": "<1-2 sentences, no more>" }]
}
Be concise — short, punchy reasoning, not essays.`,
    },
  ];
}
