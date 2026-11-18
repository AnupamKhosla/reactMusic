// The owner's login for /dashboard: a username and a password (the STATS_USERNAME and STATS_PASSWORD secrets, set
// with `npm run set-password`), remembered in an HttpOnly cookie that holds an HMAC of both, never either one.
import { env } from "cloudflare:workers";

const COOKIE = "lr_stats";

function secret(name: "STATS_USERNAME" | "STATS_PASSWORD"): string {
  const value = (env as unknown as Record<string, unknown>)[name];
  return typeof value === "string" ? value : "";
}
const username = () => secret("STATS_USERNAME");
const password = () => secret("STATS_PASSWORD");

export function hasPassword(): boolean {
  return username().length >= 3 && password().length >= 8;
}

async function token(pass: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  // The username is part of the signed text, so changing either one signs every browser out.
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`liveradio-stats-v2:${username()}`));
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

/** Returns the Set-Cookie header for a correct username and password, or null. */
export async function login(request: Request, user: string, attempt: string): Promise<string | null> {
  // Both are compared every time (no early exit), so a wrong username takes as long as a wrong password.
  const userOk = sameText(user.trim(), username());
  const passOk = sameText(attempt, password());
  if (!hasPassword() || !userOk || !passOk) {
    // Slow down guessing a little (waiting costs no CPU time on Workers).
    await new Promise((r) => setTimeout(r, 1200));
    return null;
  }
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  // Path=/ and not /dashboard: a /dashboard cookie path didn't cover the old site's /dashboard.data, so the
  // password seemed wrong after every login (18 Nov 2026).
  return `${COOKIE}=${await token(password())}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 60}${secure}`;
}

/** Clears the login cookie (and the old one scoped to /dashboard, from before 18 Nov 2026). */
export function logoutCookies(): string[] {
  return [`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`, `${COOKIE}=; Path=/dashboard; HttpOnly; SameSite=Strict; Max-Age=0`];
}
