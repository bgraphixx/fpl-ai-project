"use server";

import { getLeagueClassicStandings, getLeagueH2HStandings } from "@/lib/fpl";
import { FplClassicStandingsResponse, FplH2HStandingsResponse } from "@/types/fpl";

export async function loadMoreClassicStandings(leagueId: number, page: number): Promise<FplClassicStandingsResponse | null> {
  try {
    return (await getLeagueClassicStandings(leagueId, page)) as FplClassicStandingsResponse;
  } catch (error) {
    console.error(`Failed to load classic standings for league ${leagueId} page ${page}:`, error);
    return null;
  }
}

export async function loadMoreH2HStandings(leagueId: number, page: number): Promise<FplH2HStandingsResponse | null> {
  try {
    return (await getLeagueH2HStandings(leagueId, page)) as FplH2HStandingsResponse;
  } catch (error) {
    console.error(`Failed to load H2H standings for league ${leagueId} page ${page}:`, error);
    return null;
  }
}
