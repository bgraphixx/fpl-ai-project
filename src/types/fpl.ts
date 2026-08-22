export type Position = "GK" | "DEF" | "MID" | "FWD";

export type SquadPlayer = {
  id: number;
  position: Position;
  club: string;
  price: number; // in millions, e.g. 8.5
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type FplLeagueClassic = {
  id: number;
  name: string;
  short_name: string;
  created: string;
  closed: boolean;
  rank: number | null;
  max_entries: number | null;
  league_type: string;
  scoring: string;
  admin_entry: number;
  start_event: number;
  entry_can_leave: boolean;
  entry_can_admin: boolean;
  entry_can_invite: boolean;
  has_cup: boolean;
  cup_league: number | null;
  cup_qualified: boolean | null;
  entry_rank: number;
  entry_last_rank: number;
};

export type FplLeagueH2H = {
  id: number;
  name: string;
  short_name: string;
  created: string;
  closed: boolean;
  rank: number | null;
  max_entries: number | null;
  league_type: string;
  scoring: string;
  admin_entry: number;
  start_event: number;
  entry_can_leave: boolean;
  entry_can_admin: boolean;
  entry_can_invite: boolean;
  has_cup: boolean;
  cup_league: number | null;
  cup_qualified: boolean | null;
  entry_rank: number;
  entry_last_rank: number;
};

export type FplEntry = {
  id: number;
  joined_time: string;
  started_event: number;
  favourite_team: number | null;
  player_first_name: string;
  player_last_name: string;
  player_region_id: number;
  player_region_name: string;
  player_region_iso_code_short: string;
  player_region_iso_code_long: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  summary_event_rank: number;
  current_event: number;
  leagues: {
    classic: FplLeagueClassic[];
    h2h: FplLeagueH2H[];
  };
  name: string;
  name_change_blocked: boolean;
  kit: string | null;
};

export type FplClassicStanding = {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
  entry_name: string;
};

export type FplClassicStandingsResponse = {
  league: FplLeagueClassic;
  standings: {
    has_next: boolean;
    page: number;
    results: FplClassicStanding[];
  };
};

export type FplH2HStanding = {
  id: number;
  division: number;
  entry: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number; // League points (3 for win, 1 for draw)
  entry_name: string;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points_for: number; // Total FPL points
};

export type FplH2HStandingsResponse = {
  league: FplLeagueH2H;
  standings: {
    has_next: boolean;
    page: number;
    results: FplH2HStanding[];
  };
};
