/**
 * ZeptoMail transactional email client.
 *
 * Uses the REST API directly (no npm dependency) — a single fetch POST.
 * Every send is designed to be fire-and-forget: callers should never await
 * this in the critical path; wrap with `void sendEmail(...).catch(…)`.
 */

const ZEPTO_API_URL = "https://api.zeptomail.com/v1.1/email";

interface SendEmailOptions {
  to: { address: string; name?: string };
  subject: string;
  html: string;
}

interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const token = process.env.ZEPTO_MAIL_TOKEN;
  const senderAddress = process.env.SENDER_ADDRESS;

  if (!token || !senderAddress) {
    const msg = "ZeptoMail not configured — ZEPTO_MAIL_TOKEN or SENDER_ADDRESS missing.";
    console.warn(`[email] ${msg}`);
    return { ok: false, error: msg };
  }

  const body = {
    from: { address: senderAddress, name: "Smart Gaffer" },
    to: [{ email_address: { address: opts.to.address, name: opts.to.name ?? "" } }],
    subject: opts.subject,
    htmlbody: opts.html,
  };

  try {
    const res = await fetch(ZEPTO_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "(unreadable body)");
      const msg = `ZeptoMail ${res.status}: ${text}`;
      console.error(`[email] ${msg}`);
      return { ok: false, error: msg };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email] Network error: ${msg}`);
    return { ok: false, error: msg };
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const { passwordResetEmail } = await import("./email-templates");
  const { subject, html } = passwordResetEmail(email, resetUrl);
  
  return sendEmail({
    to: { address: email },
    subject,
    html,
  });
}
