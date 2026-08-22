import type { ChatMessage } from "@/lib/openrouter";
import type { PlayerSignal } from "@/lib/signals";
import type { SolverXIResult, SolverTransferResult } from "@/lib/solver-models";

const SYSTEM_PROMPT =
  "You are an FPL (Fantasy Premier League) expert analyst. An advanced mathematical solver " +
  "has already calculated the optimal team/transfers to maximize Expected Points (xPts) while " +
  "perfectly respecting FPL rules (budget, formation, etc.). " +
  "Your ONLY job is to explain the solver's choices to the user in a natural, engaging way. " +
  "Do NOT change the solver's picks. Do NOT invent stats. Just provide tactical reasoning " +
  "(e.g., favorable fixtures, underlying xG) to justify why the math made these choices. " +
  "Always respond with a single JSON object matching the requested schema, with no prose outside the JSON.";

export function buildXIPrompt(
  squadSignals: PlayerSignal[],
  solverResult: SolverXIResult
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        "The mathematical solver has selected this optimal Starting XI and Captain:\n\n" +
        `Solver Output:\n${JSON.stringify(solverResult, null, 2)}\n\n` +
        `Squad Stats & Context:\n${JSON.stringify(squadSignals, null, 2)}\n\n` +
        "Respond with JSON matching exactly this shape. You MUST echo the solver's startingXI, bench, captainId, and viceCaptainId exactly as provided:\n" +
        `{
  "startingXI": [<exact array from solver>],
  "bench": [<4 player ids, ordered by preference>],
  "formation": "<e.g. 3-4-3>",
  "captainId": <exact id from solver>,
  "viceCaptainId": <exact id from solver>,
  "summary": "<1 sentence overall recommendation>",
  "detail": "<2-3 sentences of tactical reasoning>",
  "perPlayer": [{ "id": <player id, starting XI only>, "summary": "<one short line>", "detail": "<1-2 sentences>" }]
}
Be concise — short, punchy reasoning.`,
    },
  ];
}

export function buildTransferPrompt(
  squadSignals: PlayerSignal[],
  candidateSignals: PlayerSignal[],
  solverResult: SolverTransferResult,
  freeTransfers: number,
  bank: number,
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `The user has ${freeTransfers} free transfer(s) and £${bank}m in the bank. ` +
        "The mathematical solver has selected these optimal transfers to maximize net points:\n\n" +
        `Solver Output:\n${JSON.stringify(solverResult, null, 2)}\n\n` +
        `Current squad:\n${JSON.stringify(squadSignals, null, 2)}\n\n` +
        `Candidate pool context:\n${JSON.stringify(candidateSignals.filter(c => solverResult.transfersIn.includes(c.id)), null, 2)}\n\n` +
        "Respond with JSON matching exactly this shape. You MUST echo the solver's transfersOut, transfersIn, and transfersMade exactly as provided:\n" +
        `{
  "transfersOut": [<exact array from solver>],
  "transfersIn": [<exact array from solver>],
  "transfersMade": <exact integer from solver>,
  "hitWorthIt": <boolean, true only if transfersMade > freeTransfers>,
  "summary": "<1 sentence overall recommendation>",
  "detail": "<2-3 sentences, including why the solver's choices make sense>",
  "perPlayer": [{ "id": <incoming player id only>, "summary": "<one short line>", "detail": "<1-2 sentences>" }]
}
Be concise — short, punchy reasoning.`,
    },
  ];
}

// Single-swap "Consult AI" (manual Transfers, player detail panel). Unlike
// the full XI/Transfer prompts, there's no solver here — the deterministic
// xPts-ranked candidate list (already filtered to same position + affordable)
// IS the ranking, and the AI's only job is to reason about the top pick or
// flag a caveat (rotation risk, tough fixture run) worth knowing.
export function buildSwapPrompt(
  outPlayer: PlayerSignal,
  candidates: PlayerSignal[],
  bank: number,
): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `The user is considering replacing this player, and has £${bank}m in the bank ` +
        `(plus whatever selling this player raises):\n\n` +
        `Outgoing:\n${JSON.stringify(outPlayer, null, 2)}\n\n` +
        "Candidates, already ranked by projected points (xPts) — the top of this list " +
        "is the mathematically best replacement; do not reorder it or suggest a player " +
        "outside this list:\n\n" +
        `${JSON.stringify(candidates, null, 2)}\n\n` +
        "Respond with JSON matching exactly this shape:\n" +
        `{
  "suggestedId": <id of the candidate you'd pick — normally candidates[0], unless a specific
    caveat (rotation risk, injury news, brutal fixture run) makes a case for a different one>,
  "reasoning": "<2-3 sentences explaining the pick, mentioning any caveats>"
}
Be concise — short, punchy reasoning.`,
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
