"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

async function patchPrefs(body: { emailRemindersEnabled?: boolean; pushRemindersEnabled?: boolean }) {
  await fetch("/api/settings/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function subscribeToPush(): Promise<boolean> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const json = subscription.toJSON();

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return true;
}

async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between border-b border-border-soft px-4 py-3.5 text-left last:border-b-0"
    >
      <span className="cap text-[15px] font-semibold">{label}</span>
      <span
        className={`relative inline-block shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-surface"}`}
        style={{ height: 24, width: 44 }}
      >
        <span
          className="absolute top-0.5 block rounded-full bg-white transition-transform"
          style={{ height: 20, width: 20, transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}

export function NotificationSettings({
  initialEmailEnabled,
  initialPushEnabled,
}: {
  initialEmailEnabled: boolean;
  initialPushEnabled: boolean;
}) {
  const [emailEnabled, setEmailEnabled] = useState(initialEmailEnabled);
  const [pushEnabled, setPushEnabled] = useState(initialPushEnabled);
  const [pushError, setPushError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleEmailToggle(next: boolean) {
    setEmailEnabled(next);
    void patchPrefs({ emailRemindersEnabled: next });
  }

  async function handlePushToggle(next: boolean) {
    setPushError(null);
    setBusy(true);
    try {
      if (next) {
        const subscribed = await subscribeToPush();
        if (!subscribed) {
          setPushError("Push permission wasn't granted — check your browser's notification settings.");
          setBusy(false);
          return;
        }
      } else {
        await unsubscribeFromPush();
      }
      setPushEnabled(next);
      await patchPrefs({ pushRemindersEnabled: next });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-text-dim">
        Deadline reminders
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <Toggle checked={emailEnabled} onChange={handleEmailToggle} label="Email reminders" />
        <Toggle checked={pushEnabled && !busy} onChange={handlePushToggle} label="Push notifications" />
      </div>
      {pushError && <p className="mt-2 px-1 text-xs text-danger">{pushError}</p>}
      <p className="mt-2 px-1 text-xs text-text-dim">
        Reminders go out 24h and 2h before each gameweek deadline.
      </p>
    </div>
  );
}
