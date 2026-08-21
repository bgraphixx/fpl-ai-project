type BootstrapEvent = {
  id: number;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
};

// The gameweek recommendations should target: the next one with an
// unpassed deadline, falling back to the current one late in the season.
export function currentGameweek(events: BootstrapEvent[]): BootstrapEvent | undefined {
  return (
    events.find((e) => e.is_next) ??
    events.find((e) => e.is_current) ??
    events.find((e) => !e.finished)
  );
}
