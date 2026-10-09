// All Farmkeke email goes through Resend (PRD). Runs in the default Convex
// runtime (fetch), so it can be called from actions and auth providers.
import { ConvexError } from "convex/values";
import { env } from "../_generated/server";

type Email = { to: string; subject: string; html: string; text: string };

export async function sendEmail(email: Email): Promise<void> {
  const apiKey = env.AUTH_RESEND_KEY;
  if (!apiKey) {
    if (env.AUTH_DEV_LOG_EMAILS === "true") {
      console.log(`[dev email] to ${email.to}: ${email.subject}\n${email.text}`);
      return;
    }
    throw new ConvexError({ code: "EMAIL_NOT_CONFIGURED", message: "Email isn't set up yet." });
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Resend's shared test sender works until a farmkeke.com domain is verified
      from: env.AUTH_EMAIL_FROM ?? "Farmkeke <onboarding@resend.dev>",
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!response.ok) {
    console.error("Resend error", response.status, await response.text());
    throw new ConvexError({ code: "EMAIL_FAILED", message: "We couldn't send the email. Try again." });
  }
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** M-54: the reset email. The link opens the app's M-55 screen. */
export function passwordResetEmail(to: string, link: string): Email {
  const text = [
    "Reset your Farmkeke password",
    "",
    "Tap the link below to make a new password. It works for 30 minutes, and only once.",
    link,
    "",
    "If you didn't ask for this, you can ignore this email. Your password won't change.",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#F2F8E6;font-family:Inter,Arial,sans-serif;color:#1A1A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:16px;border:1px solid #A9D654" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px 28px">
<p style="margin:0 0 24px;font-size:24px;font-weight:700;letter-spacing:-0.5px"><span style="color:#A9D654">farm</span><span style="color:#1A1A1A">keke</span></p>
<h1 style="margin:0 0 12px;font-size:22px;color:#1E3B16">Reset your password</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:22px">Tap the button to make a new password for ${escape(to)}. The link works for 30 minutes, and only once.</p>
<a href="${escape(link)}" style="display:inline-block;background:#A9D654;color:#1E3B16;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:17px">Make a new password</a>
<p style="margin:24px 0 0;font-size:13px;line-height:19px;color:#555555">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#555555">Farmkeke · from the farm directly to your home</p>
</td></tr></table></body></html>`;
  return { to, subject: "Reset your Farmkeke password", html, text };
}
