export type FixturesToggleValue = 0 | 1 | 3;

const OPTIONS: { key: FixturesToggleValue; label: string }[] = [
  { key: 0, label: "Off" },
  { key: 1, label: "Next game" },
  { key: 3, label: "Next 3" },
];

// Price always stays visible on Transfers (budget matters when comparing
// targets) — this only controls how many upcoming-fixture pills show
// alongside it.
export function FixturesToggle({
  value,
  onChange,
}: {
  value: FixturesToggleValue;
  onChange: (value: FixturesToggleValue) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-text-dim">Fixtures</span>
      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`cap rounded-lg px-2.5 py-1 text-xs font-bold ${
              value === opt.key ? "bg-accent text-accent-ink" : "text-text-muted"
            }`}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
