import { prisma } from "@/lib/prisma";
import { getBootstrapStatic } from "@/lib/fpl";
import { targetGameweek } from "@/lib/gameweek";
import { sendEmail } from "@/lib/email";
import { deadlineReminderEmail } from "@/lib/email-templates";
import { sendPushNotification } from "@/lib/push";

type Stage = "24h" | "2h";
// Ordered furthest-out first — the loop below picks the *closest* (last
// matching) window, so a user who was offline through both crossings still
// only ever gets the more urgent one, never a stale "24h" reminder 30
// minutes before deadline.
const STAGE_WINDOWS: { stage: Stage; hours: number }[] = [
  { stage: "24h", hours: 24 },
  { stage: "2h", hours: 2 },
];

type BootstrapEvent = { id: number; deadline_time: string; finished: boolean; is_current: boolean; is_next: boolean };

// Called from the existing 30-min cache-refresh cron (see cache-refresh.ts).
// Idempotent per (user, gameweek, stage) via User.lastReminderGw/Stage, so a
// missed or overlapping tick can't double-send.
export async function dispatchDeadlineReminders(): Promise<void> {
  const bootstrap = (await getBootstrapStatic()) as { events: BootstrapEvent[] };
  const gw = targetGameweek(bootstrap.events);
  if (!gw) return;

  const hoursUntil = (new Date(gw.deadline_time).getTime() - Date.now()) / 3_600_000;
  if (hoursUntil <= 0) return; // deadline already passed

  let currentStage: Stage | null = null;
  for (const window of STAGE_WINDOWS) {
    if (hoursUntil <= window.hours) currentStage = window.stage;
  }
  if (!currentStage) return; // more than 24h out — nothing due yet

  const users = await prisma.user.findMany({
    where: {
      fplTeamId: { not: null },
      OR: [{ emailRemindersEnabled: true }, { pushRemindersEnabled: true }],
    },
    include: { pushSubscriptions: true },
  });

  for (const user of users) {
    if (user.lastReminderGw === gw.id && user.lastReminderStage === currentStage) continue;

    if (user.emailRemindersEnabled) {
      const { subject, html } = deadlineReminderEmail(user.email, gw.id, currentStage, gw.deadline_time);
      void sendEmail({ to: { address: user.email }, subject, html }).catch((err) =>
        console.error(`[reminders] email failed for user ${user.id}:`, err),
      );
    }

    if (user.pushRemindersEnabled) {
      for (const sub of user.pushSubscriptions) {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          {
            title: currentStage === "2h" ? `Last call — GW${gw.id} deadline soon` : `GW${gw.id} deadline in ~24h`,
            body: "Check your team before the deadline.",
            url: "/squad",
          },
        );
        if (result.expired) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastReminderGw: gw.id, lastReminderStage: currentStage },
    });
  }
}
