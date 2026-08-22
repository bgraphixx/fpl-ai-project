/**
 * Branded HTML email templates for Smart Gaffer.
 *
 * All templates use inline CSS (email clients strip <style> blocks) and
 * match the app's dark design tokens: bg #070a08, accent #b6ff3d, etc.
 * Each function returns a self-contained HTML string ready for sendEmail().
 */

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// ─── Shared layout helpers ──────────────────────────────────────────────────

function layout(preheader: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>Smart Gaffer</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#070a08;font-family:'Barlow',Helvetica,Arial,sans-serif;color:#f3f7f4;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#070a08;">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#b6ff3d;width:32px;height:32px;border-radius:8px;text-align:center;vertical-align:middle;font-size:16px;font-weight:700;color:#06210a;">◈</td>
                  <td style="padding-left:12px;font-size:18px;font-weight:700;letter-spacing:0.03em;color:#f3f7f4;">Smart Gaffer</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content card -->
          <tr>
            <td style="background-color:#101613;border:1px solid #23302a;border-radius:16px;padding:32px 28px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;font-size:12px;color:#6b7c72;line-height:1.6;">
              Smart Gaffer · AI-assisted Fantasy Premier League decisions<br/>
              Not affiliated with the official game<br/>
              <a href="${APP_URL}/settings" style="color:#6b7c72;text-decoration:underline;">Email preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
    <tr>
      <td style="background-color:#b6ff3d;border-radius:10px;padding:12px 28px;">
        <a href="${href}" style="color:#06210a;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.02em;display:inline-block;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function statCell(label: string, value: string): string {
  return `<td style="padding:8px 16px 8px 0;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7c72;margin-bottom:2px;">${label}</div>
    <div style="font-size:18px;font-weight:700;color:#f3f7f4;">${value}</div>
  </td>`;
}

// ─── Template: Welcome ──────────────────────────────────────────────────────

export function welcomeEmail(email: string): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f3f7f4;letter-spacing:0.02em;">Welcome aboard ◈</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#9fb0a6;">
      Your Smart Gaffer account is live. Link your FPL Team ID and we'll pull your 15-player squad automatically — then the AI can start recommending your best XI, transfers, and full squad builds.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0e0c;border:1px solid #1a231e;border-radius:10px;padding:16px 20px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#9fb0a6;">
          <strong style="color:#f3f7f4;">Next step:</strong> Head to the app and link your FPL Team ID to get started.
        </td>
      </tr>
    </table>
    ${ctaButton("Link your team →", `${APP_URL}/onboarding`)}
  `;
  return {
    subject: "Welcome to Smart Gaffer ◈",
    html: layout(`You're in! Link your FPL team to get started.`, content),
  };
}

// ─── Template: Team Linked ──────────────────────────────────────────────────

export function teamLinkedEmail(email: string, teamId: number, teamName?: string): { subject: string; html: string } {
  const displayName = teamName ? `<strong style="color:#b6ff3d;">${escapeHtml(teamName)}</strong> (#${teamId})` : `<strong style="color:#b6ff3d;">#${teamId}</strong>`;
  const subjectName = teamName ? `${teamName} (#${teamId})` : `#${teamId}`;
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f3f7f4;letter-spacing:0.02em;">Team linked ✓</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#9fb0a6;">
      Your FPL team ${displayName} is now connected. We'll sync your squad automatically each gameweek so the AI always works with your real players.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0e0c;border:1px solid #1a231e;border-radius:10px;padding:16px 20px;width:100%;">
      <tr>
        <td style="font-size:13px;color:#9fb0a6;">
          You're all set. Choose a mode on the dashboard — <strong style="color:#f3f7f4;">Set my XI</strong>, <strong style="color:#f3f7f4;">Suggest transfers</strong>, or <strong style="color:#f3f7f4;">Build from scratch</strong>.
        </td>
      </tr>
    </table>
    ${ctaButton("Go to dashboard →", APP_URL)}
  `;
  return {
    subject: `${subjectName} linked — you're all set`,
    html: layout(`FPL Team ${subjectName} is now connected to your account.`, content),
  };
}

// ─── Template: XI Recommendation ────────────────────────────────────────────

export function xiRecommendationEmail(
  email: string,
  gameweek: number,
  formation: string,
  captain: string,
  summary: string,
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f3f7f4;letter-spacing:0.02em;">GW${gameweek} — Your best XI is ready</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#9fb0a6;">
      The AI has picked your optimal starting lineup for Gameweek ${gameweek}. Here's the headline:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${statCell("Formation", formation)}
        ${statCell("Captain", captain)}
        ${statCell("Gameweek", `GW${gameweek}`)}
      </tr>
    </table>
    <div style="margin-top:20px;padding:16px 20px;background-color:#0a0e0c;border:1px solid #1a231e;border-radius:10px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7c72;margin-bottom:6px;">AI Summary</div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#9fb0a6;">${escapeHtml(summary)}</p>
    </div>
    ${ctaButton("View full breakdown →", `${APP_URL}/xi`)}
  `;
  return {
    subject: `GW${gameweek} XI ready — ${formation} with ${captain} (C)`,
    html: layout(`Your GW${gameweek} starting XI is in: ${formation}, captain ${captain}.`, content),
  };
}

// ─── Template: Transfer Recommendation ──────────────────────────────────────

export function transferRecommendationEmail(
  email: string,
  gameweek: number,
  transfersIn: string[],
  transfersOut: string[],
  hitCost: number,
  summary: string,
): { subject: string; html: string } {
  const moveCount = transfersIn.length;
  const hitLabel = hitCost > 0 ? `−${hitCost} pts` : "Free";

  const transferRows = transfersOut
    .map(
      (out, i) =>
        `<tr>
          <td style="padding:6px 12px 6px 0;font-size:14px;color:#ff5d52;">✕ ${escapeHtml(out)}</td>
          <td style="padding:6px 0;font-size:14px;color:#9fb0a6;">→</td>
          <td style="padding:6px 0 6px 12px;font-size:14px;color:#37c06a;">✓ ${escapeHtml(transfersIn[i] ?? "")}</td>
        </tr>`,
    )
    .join("");

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f3f7f4;letter-spacing:0.02em;">GW${gameweek} — Transfer plan ready</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#9fb0a6;">
      The AI recommends ${moveCount} transfer${moveCount !== 1 ? "s" : ""} for Gameweek ${gameweek}.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${statCell("Moves", String(moveCount))}
        ${statCell("Hit cost", hitLabel)}
        ${statCell("Gameweek", `GW${gameweek}`)}
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;width:100%;background-color:#0a0e0c;border:1px solid #1a231e;border-radius:10px;padding:12px 16px;">
      ${transferRows}
    </table>
    <div style="margin-top:16px;padding:16px 20px;background-color:#0a0e0c;border:1px solid #1a231e;border-radius:10px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7c72;margin-bottom:6px;">AI Summary</div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#9fb0a6;">${escapeHtml(summary)}</p>
    </div>
    ${ctaButton("View full breakdown →", `${APP_URL}/transfers`)}
  `;
  return {
    subject: `GW${gameweek} transfers — ${moveCount} move${moveCount !== 1 ? "s" : ""} (${hitLabel})`,
    html: layout(`Your GW${gameweek} transfer plan: ${moveCount} move(s), ${hitLabel}.`, content),
  };
}

// ─── Template: Build Recommendation ─────────────────────────────────────────

export function buildRecommendationEmail(
  email: string,
  gameweek: number,
  formation: string,
  captain: string,
  summary: string,
): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#f3f7f4;letter-spacing:0.02em;">GW${gameweek} — Fresh squad built</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#9fb0a6;">
      The AI has assembled a full 15-player squad from scratch for Gameweek ${gameweek} — perfect for wildcards, free hits, or starting fresh.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${statCell("Formation", formation)}
        ${statCell("Captain", captain)}
        ${statCell("Gameweek", `GW${gameweek}`)}
      </tr>
    </table>
    <div style="margin-top:20px;padding:16px 20px;background-color:#0a0e0c;border:1px solid #1a231e;border-radius:10px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7c72;margin-bottom:6px;">AI Summary</div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#9fb0a6;">${escapeHtml(summary)}</p>
    </div>
    ${ctaButton("View full squad →", `${APP_URL}/build`)}
  `;
  return {
    subject: `GW${gameweek} squad built — ${formation} with ${captain} (C)`,
    html: layout(`Your GW${gameweek} squad is ready: ${formation}, captain ${captain}.`, content),
  };
}

// ─── Utility ────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
