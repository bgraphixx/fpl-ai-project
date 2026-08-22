type BootstrapEvent = {
  id: number;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
};

// The gameweek recommendations should target: the next one with an
// unpassed deadline, falling back to the current one late in the season.
export function targetGameweek(events: BootstrapEvent[]): BootstrapEvent | undefined {
  return (
    events.find((e) => e.is_next) ??
    events.find((e) => e.is_current) ??
    events.find((e) => !e.finished)
  );
}

// The gameweek whose picks FPL actually has published. `/entry/{id}/event/{gw}/picks/`
// 404s for a future gameweek until its own deadline has passed — even though
// that gameweek may already be flagged `is_next` — so squad fetching needs the
// *current* (deadline already passed, not yet finished) gameweek, not the next
// one. Falls back to the most recent finished gameweek late in a gameweek's
// window, when `is_current` may have already rolled over.
export function pickableGameweek(events: BootstrapEvent[]): BootstrapEvent | undefined {
  return (
    events.find((e) => e.is_current) ??
    [...events].reverse().find((e) => e.finished)
  );
}
