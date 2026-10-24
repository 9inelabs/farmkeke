import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { env, httpAction, type ActionCtx } from "./_generated/server";
import { auth } from "./auth";
import { chargeArgs, paymentsLive, paystack, validSignature, type PaystackTransaction } from "./lib/paystack";
import { wordmarkPng } from "./lib/wordmarkPng";

const http = httpRouter();

auth.addHttpRoutes(http);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The password reset email links here when the reset was asked for in the app
 * (https works in every mail client). The page opens the app's M-55 "Create
 * new password" screen. If the app doesn't open within about 1.5 seconds (not
 * installed, or a computer), it goes to the website's W-42c page instead.
 */
http.route({
  path: "/reset-password",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email") ?? "";
    const code = url.searchParams.get("code") ?? "";
    const appLink = `farmkeke://reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
    const webLink = `${(env.WEBSITE_URL?.trim() || "https://farmkeke.com").replace(/\/+$/, "")}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
    // Leaving the page (the app opened) cancels the fallback.
    const script = `(function(){var web=${JSON.stringify(webLink)};var t=setTimeout(function(){window.location.replace(web);},1500);document.addEventListener("visibilitychange",function(){if(document.hidden)clearTimeout(t);});window.addEventListener("pagehide",function(){clearTimeout(t);});window.location.replace(${JSON.stringify(appLink)});})();`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reset your password · Farmkeke</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F2F8E6;font-family:Inter,system-ui,Arial,sans-serif;color:#1A1A1A}
main{max-width:360px;margin:24px;background:#fff;border:1px solid #A9D654;border-radius:16px;padding:32px 24px;text-align:center}
.mark{font-size:28px;font-weight:700;margin:0 0 20px}.mark span{color:#A9D654}
h1{font-size:20px;color:#1E3B16;margin:0 0 8px}p{font-size:15px;line-height:22px;color:rgba(26,26,26,.7);margin:0 0 24px}
a.btn{display:block;background:#A9D654;color:#1E3B16;font-weight:600;text-decoration:none;padding:14px;border-radius:17px}
a.alt{display:block;margin-top:16px;color:#1E3B16;font-size:14px}
</style></head><body><main>
<p class="mark"><span>farm</span>keke</p>
<h1>Make a new password</h1>
<p>Opening the Farmkeke app on this phone…</p>
<a class="btn" href="${escapeHtml(appLink)}">Open Farmkeke</a>
<a class="alt" href="${escapeHtml(webLink)}">No app? Make a new password on the website</a>
</main><script>${script}</script></body></html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }),
});

const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Asks Paystack about one reference and applies the answer. */
async function verifyReference(ctx: ActionCtx, reference: string): Promise<boolean> {
  const tx = await paystack<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (tx.ok && ["success", "failed", "abandoned", "reversed"].includes(tx.data.status)) {
    await ctx.runMutation(internal.payments.checkout.settleCharge, chargeArgs(tx.data));
  }
  return tx.ok && tx.data.status === "success";
}

/**
 * Paystack webhook (one per mode, shared by the app and website). The
 * x-paystack-signature header must be the HMAC-SHA512 of the raw body with
 * the secret key. Charge events are re-checked with Paystack before use.
 */
http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const raw = await request.text();
    if (!(await validSignature(raw, request.headers.get("x-paystack-signature")))) {
      return new Response("Invalid signature", { status: 401 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    if (typeof body !== "object" || body === null) return new Response("Bad body", { status: 400 });
    const event = str((body as { event?: unknown }).event);
    const data = (body as { data?: unknown }).data;
    if (event === undefined || typeof data !== "object" || data === null) {
      return new Response("Bad body", { status: 400 });
    }
    const d = data as Record<string, unknown>;

    if (event === "charge.success") {
      const reference = str(d.reference);
      if (reference === undefined) return new Response("Missing reference", { status: 400 });
      // Trust Paystack's verify endpoint over the event body.
      await verifyReference(ctx, reference);
    } else if (event.startsWith("refund.")) {
      const transactionReference = str(d.transaction_reference);
      if (transactionReference === undefined) return new Response("Missing reference", { status: 400 });
      await ctx.runMutation(internal.payments.refunds.settleEvent, {
        event,
        status: str(d.status) ?? event.slice("refund.".length),
        transactionReference,
        providerRefundId: d.id === undefined || d.id === null ? undefined : String(d.id),
        amountKobo: num(d.amount),
      });
    } else if (event.startsWith("transfer.")) {
      const reference = str(d.reference);
      if (reference === undefined) return new Response("Missing reference", { status: 400 });
      await ctx.runMutation(internal.payments.payouts.settleTransfer, {
        event,
        reference,
        status: str(d.status),
        transferCode: str(d.transfer_code),
        amountKobo: num(d.amount),
        reason: str(d.reason),
      });
    }
    // Anything else is acknowledged and ignored.
    return new Response("ok", { status: 200 });
  }),
});

/**
 * Paystack's callback for app payments (start with returnTo: "app"). Checks
 * the payment, then hands back to the app's pay screen.
 */
http.route({
  path: "/paystack/return",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const checkoutId = url.searchParams.get("checkoutId") ?? "";
    const payToken = url.searchParams.get("payToken");
    const reference = url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? "";
    const paid = reference && paymentsLive() ? await verifyReference(ctx, reference) : false;
    // Back to the screen the payment started on: a bill's pay link works for whoever paid it
    const screen = payToken ? `pay/${encodeURIComponent(payToken)}` : `checkout/pay/${encodeURIComponent(checkoutId)}`;
    const appLink = `farmkeke://${screen}${reference ? `?reference=${encodeURIComponent(reference)}` : ""}`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment · Farmkeke</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F2F8E6;font-family:Inter,system-ui,Arial,sans-serif;color:#1A1A1A}
main{max-width:360px;margin:24px;background:#fff;border:1px solid #A9D654;border-radius:16px;padding:32px 24px;text-align:center}
.mark{font-size:28px;font-weight:700;margin:0 0 20px}.mark span{color:#A9D654}
h1{font-size:20px;color:#1E3B16;margin:0 0 8px}p{font-size:15px;line-height:22px;color:rgba(26,26,26,.7);margin:0 0 24px}
a.btn{display:block;background:#A9D654;color:#1E3B16;font-weight:600;text-decoration:none;padding:14px;border-radius:17px}
</style></head><body><main>
<p class="mark"><span>farm</span>keke</p>
<h1>${paid ? "Payment received" : "Back to Farmkeke"}</h1>
<p>Taking you back to the app${paid ? " to see your order" : ""}…</p>
<a class="btn" href="${escapeHtml(appLink)}">Open Farmkeke</a>
</main><script>window.location.replace(${JSON.stringify(appLink)});</script></body></html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }),
});

/** The logo every email shows (lib/emails.wordmarkUrl). Cached for a year. */
http.route({
  path: "/email/wordmark.png",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(wordmarkPng(), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

/**
 * Farm emails' "Open the Farmkeke app" button (https works in every mail
 * client). Opens the app; without it installed, links to the website's
 * Get the app page.
 */
http.route({
  path: "/open-app",
  method: "GET",
  handler: httpAction(async () => {
    const appLink = "farmkeke://";
    const getApp = `${(env.WEBSITE_URL ?? "https://farmkeke.com").replace(/\/+$/, "")}/get-the-app`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Open Farmkeke</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F2F8E6;font-family:Inter,system-ui,Arial,sans-serif;color:#1A1A1A}
main{max-width:360px;margin:24px;background:#fff;border:1px solid #A9D654;border-radius:16px;padding:32px 24px;text-align:center}
.mark{font-size:28px;font-weight:700;margin:0 0 20px}.mark span{color:#A9D654}
h1{font-size:20px;color:#1E3B16;margin:0 0 8px}p{font-size:15px;line-height:22px;color:rgba(26,26,26,.7);margin:0 0 24px}
a.btn{display:block;background:#A9D654;color:#1E3B16;font-weight:600;text-decoration:none;padding:14px;border-radius:17px}
a.alt{display:block;margin-top:16px;color:#1E3B16;font-size:14px}
</style></head><body><main>
<p class="mark"><span>farm</span>keke</p>
<h1>Open the Farmkeke app</h1>
<p>Opening Farmkeke on this phone… Switch to farmer mode to see your farm.</p>
<a class="btn" href="${escapeHtml(appLink)}">Open Farmkeke</a>
<a class="alt" href="${escapeHtml(getApp)}">Don't have the app? Get it here</a>
</main><script>window.location.replace(${JSON.stringify(appLink)});</script></body></html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }),
});

export default http;
