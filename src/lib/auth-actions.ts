"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { createUser, EmailInUseError } from "@/lib/user";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";

export async function registerAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    await createUser(email, password);
  } catch (err) {
    if (err instanceof EmailInUseError) return { error: err.message };
    throw err;
  }

  // Fire-and-forget welcome email — never blocks registration
  const { subject, html } = welcomeEmail(email);
  void sendEmail({ to: { address: email }, subject, html }).catch(console.error);

  try {
    await signIn("credentials", { email, password, redirectTo: "/onboarding" });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) return { error: "Account created — please sign in." };
    throw err;
  }
}

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Incorrect email or password." };
    }
    throw err;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
