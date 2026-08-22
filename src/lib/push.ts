import webpush from "web-push";

// VAPID keys are the identity a browser's push service uses to verify a
// server is who it says it is — one keypair for the whole app, generated
// once (see .env.example), reused forever. Regenerating them invalidates
// every existing subscription.
let configured = false;
function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Push not configured — VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT missing.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type SendPushResult = { ok: boolean; expired: boolean; error?: string };

// Fire-and-forget from callers' perspective — `expired: true` tells the
// caller to delete the subscription (the browser unsubscribed or the
// endpoint is gone; retrying is pointless).
export async function sendPushNotification(
  subscription: PushSubscriptionInput,
  payload: { title: string; body: string; url?: string },
): Promise<SendPushResult> {
  try {
    ensureConfigured();
  } catch (err) {
    return { ok: false, expired: false, error: err instanceof Error ? err.message : String(err) };
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, expired: false };
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    // 404/410 = the push service has no record of this subscription anymore
    // (user uninstalled, cleared site data, etc.) — it will never succeed.
    const expired = statusCode === 404 || statusCode === 410;
    return { ok: false, expired, error: err instanceof Error ? err.message : String(err) };
  }
}
