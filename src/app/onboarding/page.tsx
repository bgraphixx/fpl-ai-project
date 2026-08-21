import { LinkTeamForm } from "@/components/LinkTeamForm";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="cap mb-2 text-4xl font-bold leading-tight">Link your FPL team</h1>
        <p className="mb-7 text-[15px] leading-relaxed text-text-muted">
          We&apos;ll pull your 15 players automatically so the AI works with your real squad.
        </p>
        <LinkTeamForm />
      </div>
    </div>
  );
}
