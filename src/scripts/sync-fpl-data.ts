import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FPL_BASE = "https://fantasy.premierleague.com/api";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "FPL-AI-Picker (github.com/bgraphixx/fpl-ai-project)",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function syncTeamStrengths(teams: any[]) {
  console.log(`Syncing ${teams.length} Team Strengths...`);
  for (const t of teams) {
    await prisma.teamStrength.upsert({
      where: { id: t.id },
      update: {
        strengthAttackHome: t.strength_attack_home,
        strengthAttackAway: t.strength_attack_away,
        strengthDefenseHome: t.strength_defence_home,
        strengthDefenseAway: t.strength_defence_away,
        syncedAt: new Date(),
      },
      create: {
        id: t.id,
        strengthAttackHome: t.strength_attack_home,
        strengthAttackAway: t.strength_attack_away,
        strengthDefenseHome: t.strength_defence_home,
        strengthDefenseAway: t.strength_defence_away,
      },
    });
  }
  console.log("Team Strengths synced.");
}

async function syncPlayerHistory(elements: any[]) {
  const existing = await prisma.playerHistory.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((e) => e.id));

  const missing = elements.filter((el) => !existingIds.has(el.id));
  console.log(`Found ${elements.length} total players. ${missing.length} missing historical data.`);

  if (missing.length === 0) {
    console.log("Player History is fully up to date.");
    return;
  }

  console.log(`Fetching history for ${missing.length} players (with 150ms delay to respect rate limits)...`);
  
  let count = 0;
  for (const el of missing) {
    try {
      const summary = await fetchJson(`${FPL_BASE}/element-summary/${el.id}/`);
      
      const historyPast = summary.history_past;
      if (historyPast && historyPast.length > 0) {
        const lastSeason = historyPast[historyPast.length - 1]; // most recent season
        await prisma.playerHistory.create({
          data: {
            id: el.id,
            pastSeasonMinutes: Number(lastSeason.minutes) || 0,
            pastSeasonStarts: Number(lastSeason.starts) || 0,
            pastSeasonXG: Number(lastSeason.expected_goals) || 0,
            pastSeasonXA: Number(lastSeason.expected_assists) || 0,
            pastSeasonXGC: Number(lastSeason.expected_goals_conceded) || 0,
            pastSeasonXGI: Number(lastSeason.expected_goal_involvements) || 0,
            pastSeasonSaves: Number(lastSeason.saves) || 0,
            pastSeasonBPS: Number(lastSeason.bps) || 0,
          },
        });
      } else {
        // Player has no history (e.g. newly promoted, youth player, transfer from abroad)
        // Insert a dummy record of all 0s so we don't try to fetch them again
        await prisma.playerHistory.create({
          data: {
            id: el.id,
            pastSeasonMinutes: 0,
            pastSeasonStarts: 0,
            pastSeasonXG: 0,
            pastSeasonXA: 0,
            pastSeasonXGC: 0,
            pastSeasonXGI: 0,
            pastSeasonSaves: 0,
            pastSeasonBPS: 0,
          },
        });
      }

      count++;
      if (count % 10 === 0) {
        console.log(`Synced ${count} / ${missing.length}...`);
      }
      
      // Delay to avoid HTTP 429 Too Many Requests
      await sleep(150);
    } catch (err) {
      console.error(`Error syncing player ${el.id} (${el.web_name}):`, err);
    }
  }

  console.log("Player History sync complete!");
}

async function run() {
  console.log("Starting FPL data sync...");
  try {
    const bootstrap = await fetchJson(`${FPL_BASE}/bootstrap-static/`);
    
    await syncTeamStrengths(bootstrap.teams);
    await syncPlayerHistory(bootstrap.elements);
    
  } catch (err) {
    console.error("Sync failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
