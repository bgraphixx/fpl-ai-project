import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export class EmailInUseError extends Error {
  constructor() {
    super("Email already in use");
  }
}

export async function createUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new EmailInUseError();

  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true },
  });
}

export function linkFplTeam(userId: string, fplTeamId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { fplTeamId },
    select: { id: true, email: true, fplTeamId: true },
  });
}
