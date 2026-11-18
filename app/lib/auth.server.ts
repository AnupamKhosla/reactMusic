// The owner's login for /dashboard: one password (the STATS_PASSWORD secret), remembered in an HttpOnly cookie
// that holds an HMAC of the password, never the password itself.
import { env } from "cloudflare:workers";

const COOKIE = "lr_stats";

function password(): string {
  const value = (env as unknown as { STATS_PASSWORD?: string }).STATS_PASSWORD;
  return typeof value === "string" ? value : "";
}

export function hasPassword(): boolean {
  return password().length >= 8;
}

async function token(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("liveradio-stats-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

export async function isOwner(request: Request): Promise<boolean> {
  if (!hasPassword()) return false;
  const value = readCookie(request, COOKIE);
  return value.length > 0 && sameText(value, await token(password()));
}

/** Returns the Set-Cookie header for a correct password, or null. */
export async function login(request: Request, attempt: string): Promise<string | null> {
  if (!hasPassword() || !sameText(attempt, password())) {
    // Slow down guessing a little (waiting costs no CPU time on Workers).
    await new Promise((r) => setTimeout(r, 1200));
    return null;
  }
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  // Path=/ and not /dashboard: the page loads its data from /dashboard.data, which a /dashboard cookie path does
  // not cover (the next character must be "/"), so the password seemed wrong after every login (18 Nov 2026).
  return `${COOKIE}=${await token(password())}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 60}${secure}`;
}

/** Clears the login cookie (and the old one scoped to /dashboard, from before 18 Nov 2026). */
export function logoutCookies(): string[] {
  return [`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`, `${COOKIE}=; Path=/dashboard; HttpOnly; SameSite=Strict; Max-Age=0`];
}
