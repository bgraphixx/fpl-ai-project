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

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "@/lib/email";
import { auth } from "@/lib/auth";

export async function forgotPasswordAction(
  _prevState: { message: string | null; error: string | null },
  formData: FormData,
): Promise<{ message: string | null; error: string | null }> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  if (!email) return { message: null, error: "Email is required." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return success to avoid email enumeration
    return { message: "If an account exists, a reset link has been sent.", error: null };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  void sendPasswordResetEmail(email, resetUrl).catch(console.error);

  return { message: "If an account exists, a reset link has been sent.", error: null };
}

export async function resetPasswordAction(
  _prevState: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token || !password) return { error: "Invalid request.", success: false };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", success: false };

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  
  if (!resetToken || resetToken.expiresAt < new Date()) {
    return { error: "Invalid or expired token.", success: false };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { email: resetToken.email },
    }),
  ]);

  return { error: null, success: true };
}

export async function changePasswordAction(
  _prevState: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized", success: false };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!currentPassword || !newPassword) return { error: "Both fields are required.", success: false };
  if (newPassword.length < 8) return { error: "New password must be at least 8 characters.", success: false };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "User not found.", success: false };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Incorrect current password.", success: false };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { error: null, success: true };
}
