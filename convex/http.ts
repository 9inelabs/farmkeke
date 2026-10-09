import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The password reset email links here (https works in every mail client).
 * The page opens the app's M-55 "Create new password" screen. When the
 * website exists, its W-42c page takes over for people without the app.
 */
http.route({
  path: "/reset-password",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email") ?? "";
    const code = url.searchParams.get("code") ?? "";
    const appLink = `farmkeke://reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reset your password · Farmkeke</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F2F8E6;font-family:Inter,system-ui,Arial,sans-serif;color:#1A1A1A}
main{max-width:360px;margin:24px;background:#fff;border:1px solid #A9D654;border-radius:16px;padding:32px 24px;text-align:center}
.mark{font-size:28px;font-weight:700;margin:0 0 20px}.mark span{color:#A9D654}
h1{font-size:20px;color:#1E3B16;margin:0 0 8px}p{font-size:15px;line-height:22px;color:rgba(26,26,26,.7);margin:0 0 24px}
a.btn{display:block;background:#A9D654;color:#1E3B16;font-weight:600;text-decoration:none;padding:14px;border-radius:17px}
</style></head><body><main>
<p class="mark"><span>farm</span>keke</p>
<h1>Make a new password</h1>
<p>Opening the Farmkeke app on this phone…</p>
<a class="btn" href="${escapeHtml(appLink)}">Open Farmkeke</a>
</main><script>window.location.replace(${JSON.stringify(appLink)});</script></body></html>`;
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }),
});

export default http;
