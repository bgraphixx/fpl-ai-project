import { RegisterForm } from "@/components/RegisterForm";
import { Logo } from "@/components/AppShell";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-10">
        <Logo />
      </div>
      <h1 className="cap mb-1.5 text-4xl font-bold">Create account</h1>
      <p className="mb-8 text-[15px] text-text-muted">One minute. Then link your team.</p>
      <RegisterForm />
    </div>
  );
}
