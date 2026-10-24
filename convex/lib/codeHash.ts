/** A texted code is kept only as SHA-256 of "<phone>:<code>". */
export async function codeHash(code: string, phone: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${phone}:${code}`));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
