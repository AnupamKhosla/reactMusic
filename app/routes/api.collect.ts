// Receives the anonymous visit events from the browser (app/lib/analytics.client.ts).
import { env } from "cloudflare:workers";
import type { Route } from "./+types/api.collect";
import { recordBatch } from "~/lib/analytics.server";

const MAX_BODY = 16_000;

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  // Only pages of this site may send events.
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return new Response(null, { status: 403 });
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return new Response(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body || typeof body !== "object") return new Response(null, { status: 400 });

  try {
    const result = await recordBatch(env.DB, request, body as Parameters<typeof recordBatch>[2]);
    return new Response(null, { status: result.ok ? 204 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("collect failed", String(error));
    return new Response(null, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export function loader() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
