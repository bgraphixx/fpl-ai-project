export type DisplayMode = "price" | "next1" | "next3";

const OPTIONS: { key: DisplayMode; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "next1", label: "Next game" },
  { key: "next3", label: "Next 3" },
];

// Segmented control switching a pitch view between showing price or a
// player's next 1/3 fixtures (color-coded by difficulty).
export function DisplayModeToggle({
  mode,
  onChange,
}: {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`cap flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-bold ${
            mode === opt.key ? "bg-accent text-accent-ink" : "text-text-muted"
          }`}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
