export function GeneratingScreen({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: string[];
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-8 flex gap-3">
        <div className="dot1 h-5 w-5 rounded-md bg-accent" />
        <div className="dot2 h-5 w-5 rounded-md bg-success" />
        <div className="dot3 h-5 w-5 rounded-md bg-success-deep" />
      </div>
      <h1 className="cap mb-2.5 text-3xl font-bold leading-tight">{title}</h1>
      <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-text-muted">{subtitle}</p>
      <div className="flex w-full max-w-xs flex-col gap-3 text-left">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-3 text-sm text-[#cdd8d1]">
            <span className={i === steps.length - 1 ? "dot1 text-accent" : "text-success"}>
              {i === steps.length - 1 ? "◈" : "✓"}
            </span>
            {step}
          </div>
        ))}
      </div>
      <div className="relative mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2">
        <div className="absolute top-0 left-0 h-full w-2/5 rounded-full bg-gradient-to-r from-success-deep to-accent [animation:sweep_1.4s_ease-in-out_infinite]" />
      </div>
      <p className="mt-3.5 text-xs text-text-dim">
        Model: primary · falls back automatically if busy
      </p>
    </div>
  );
}
