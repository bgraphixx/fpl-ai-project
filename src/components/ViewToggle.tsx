export function ViewToggle({
  view,
  onChange,
}: {
  view: "pitch" | "table";
  onChange: (v: "pitch" | "table") => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1">
      <button
        onClick={() => onChange("pitch")}
        className={`cap flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-[15px] font-bold ${
          view === "pitch" ? "bg-accent text-accent-ink" : "text-text-muted"
        }`}
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <path d="M12 5v14" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Pitch
      </button>
      <button
        onClick={() => onChange("table")}
        className={`cap flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-[15px] font-bold ${
          view === "table" ? "bg-accent text-accent-ink" : "text-text-muted"
        }`}
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
        </svg>
        Table
      </button>
    </div>
  );
}
