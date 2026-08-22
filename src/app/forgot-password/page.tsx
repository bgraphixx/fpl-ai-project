import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Logo } from "@/components/AppShell";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-10">
        <Logo />
      </div>
      <h1 className="cap mb-1.5 text-4xl font-bold">Reset password</h1>
      <p className="mb-8 text-[15px] text-text-muted">Enter your email to get a reset link.</p>
      <ForgotPasswordForm />
    </div>
  );
}
