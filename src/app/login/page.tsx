import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/AppShell";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-10">
        <Logo />
      </div>
      <h1 className="cap mb-1.5 text-4xl font-bold">Welcome back</h1>
      <p className="mb-8 text-[15px] text-text-muted">Sign in to pick your gameweek.</p>
      <LoginForm />
    </div>
  );
}
