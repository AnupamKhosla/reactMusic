// Stores the anonymous visit events sent by app/lib/analytics.client.ts, and counts crawler visits to pages.
import { isbot } from "isbot";

const EVENT_TYPES = new Set(["pageview", "engage", "play", "playing", "listen", "play_error", "search", "favorite", "share"]);
const ID = /^[A-Za-z0-9-]{8,64}$/;

// Networks of hosting companies: real listeners rarely browse from them, scripts and scrapers often do.
const DATACENTER = /amazon|aws|google cloud|google llc|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|oracle|alibaba|tencent|contabo|vultr|choopa|scaleway|leaseweb|m247|datacamp|cdn77|hostinger|ionos|colocrossing|psychz|quadranet|zenlayer|g-core|gcore|kamatera|servers\.com|hostroyale/i;

export function utcDay(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

export function deviceFrom(ua: string, width?: number): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) return "mobile";
  if (typeof width === "number" && width > 0 && width < 600) return "mobile";
  return "desktop";
}

export function browserFrom(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

export function osFrom(ua: string): string {
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

/** A short name for where a visit came from: utm_source if given, else the referring site. */
export function sourceFrom(referrer: string, utmSource: string): string {
  if (utmSource) return utmSource.toLowerCase().slice(0, 40);
  const host = referrer.toLowerCase().replace(/^www\./, "");
  if (!host) return "direct";
  const known: [RegExp, string][] = [
    [/(^|\.)google\./, "google"],
    [/(^|\.)bing\.com$/, "bing"],
    [/duckduckgo\.com$/, "duckduckgo"],
    [/(^|\.)yahoo\./, "yahoo"],
    [/(^|\.)yandex\./, "yandex"],
    [/baidu\.com$/, "baidu"],
    [/ecosia\.org$/, "ecosia"],
    [/(^|\.)(facebook|fb)\.com$|^l\.facebook\.com$|^lm\.facebook\.com$/, "facebook"],
    [/instagram\.com$/, "instagram"],
    [/^t\.co$|(^|\.)(twitter|x)\.com$/, "x"],
    [/reddit\.com$/, "reddit"],
    [/youtube\.com$|youtu\.be$/, "youtube"],
    [/linkedin\.com$|lnkd\.in$/, "linkedin"],
    [/chatgpt\.com$|openai\.com$/, "chatgpt"],
    [/perplexity\.ai$/, "perplexity"],
    [/claude\.ai$/, "claude"],
    [/gemini\.google\.com$/, "gemini"],
    [/whatsapp\.com$/, "whatsapp"],
    [/t\.me$|telegram\./, "telegram"],
    [/github\.com$|github\.io$/, "github"],
    [/news\.ycombinator\.com$/, "hackernews"],
    [/producthunt\.com$/, "producthunt"],
  ];
  for (const [re, name] of known) if (re.test(host)) return name;
  return host.slice(0, 60);
}

export function botReason(request: Request, webdriver: boolean): string | null {
  const ua = request.headers.get("User-Agent") || "";
  if (!ua) return "ua";
  if (/HeadlessChrome|PhantomJS|Lighthouse|Puppeteer|Playwright|Selenium/i.test(ua)) return "headless";
  if (isbot(ua)) return "ua";
  if (webdriver) return "webdriver";
  const cf = (request as Request & { cf?: { asOrganization?: string } }).cf;
  if (cf?.asOrganization && DATACENTER.test(cf.asOrganization)) return "datacenter";
  return null;
}

type Incoming = {
  visitor?: unknown;
  session?: unknown;
  events?: unknown;
  info?: {
    referrer?: unknown;
    utm_source?: unknown;
    utm_medium?: unknown;
    utm_campaign?: unknown;
    landing?: unknown;
    width?: unknown;
    webdriver?: unknown;
  };
};

type CleanEvent = {
  type: string;
  ts: number;
  path: string | null;
  station: string | null;
  station_name: string | null;
  value: number | null;
  label: string | null;
};

export async function recordBatch(db: D1Database, request: Request, body: Incoming): Promise<{ ok: boolean; reason?: string }> {
  const visitor = typeof body.visitor === "string" && ID.test(body.visitor) ? body.visitor : null;
  const session = typeof body.session === "string" && ID.test(body.session) ? body.session : null;
  if (!visitor || !session || !Array.isArray(body.events)) return { ok: false, reason: "bad ids" };

  const now = Date.now();
  const events: CleanEvent[] = [];
  for (const raw of body.events.slice(0, 40)) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    if (typeof e.type !== "string" || !EVENT_TYPES.has(e.type)) continue;
    const ts = typeof e.ts === "number" && e.ts > now - 86400_000 && e.ts < now + 60_000 ? Math.floor(e.ts) : now;
    let value = typeof e.value === "number" && Number.isFinite(e.value) ? Math.round(e.value) : null;
    if (e.type === "listen") value = Math.max(0, Math.min(value ?? 0, 120));
    events.push({
      type: e.type,
      ts,
      path: clip(e.path, 300),
      station: typeof e.station === "string" && /^[0-9a-f-]{36}$/i.test(e.station) ? e.station.toLowerCase() : null,
      station_name: clip(e.station_name, 120),
      value,
      label: clip(e.label, 100),
    });
  }
  if (events.length === 0) return { ok: true };

  const ua = request.headers.get("User-Agent") || "";
  const info = body.info ?? {};
  const webdriver = info.webdriver === true;
  const reason = botReason(request, webdriver);
  const cf = (request as Request & { cf?: { country?: string } }).cf;
  const country = typeof cf?.country === "string" ? cf.country.toUpperCase().slice(0, 2) : null;
  const width = typeof info.width === "number" ? info.width : undefined;
  const referrer = clip(info.referrer, 120) ?? "";
  const utmSource = clip(info.utm_source, 60) ?? "";

  const day = utcDay(events[0].ts);
  const pageviews = events.filter((e) => e.type === "pageview").length;
  const plays = events.filter((e) => e.type === "playing").length;
  const listen = events.filter((e) => e.type === "listen").reduce((sum, e) => sum + (e.value ?? 0), 0);
  // A real tap, click, key press or scroll was seen (sent once per visit as "engage").
  const human = events.some((e) => e.type === "engage") ? 1 : 0;
  const lastTs = Math.max(...events.map((e) => e.ts));

  const known = await db
    .prepare("SELECT (SELECT 1 FROM sessions WHERE session = ?1) AS has_session, (SELECT first_day FROM visitors WHERE visitor = ?2) AS first_day")
    .bind(session, visitor)
    .first<{ has_session: number | null; first_day: string | null }>();
  const newSession = !known?.has_session;
  const newVisitor = !known?.first_day;

  const statements: D1PreparedStatement[] = [];
  if (newSession) {
    statements.push(
      db
        .prepare(
          `INSERT INTO sessions (session, visitor, day, started, last_seen, country, device, browser, os, referrer, source, medium, campaign, landing, is_new, human, bot_reason, pageviews, plays, listen_secs)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)
           ON CONFLICT(session) DO NOTHING`,
        )
        .bind(
          session,
          visitor,
          day,
          events[0].ts,
          lastTs,
          country,
          deviceFrom(ua, width),
          browserFrom(ua),
          osFrom(ua),
          referrer,
          sourceFrom(referrer, utmSource),
          clip(info.utm_medium, 60),
          clip(info.utm_campaign, 80),
          clip(info.landing, 300) ?? events[0].path,
          newVisitor ? 1 : 0,
          0,
          reason,
          0,
          0,
          0,
        ),
    );
    statements.push(
      newVisitor
        ? db.prepare("INSERT INTO visitors (visitor, first_day, last_day, visits) VALUES (?1, ?2, ?2, 1) ON CONFLICT(visitor) DO NOTHING").bind(visitor, day)
        : db.prepare("UPDATE visitors SET last_day = ?2, visits = visits + 1 WHERE visitor = ?1").bind(visitor, day),
    );
  }
  statements.push(
    db
      .prepare(
        `UPDATE sessions SET last_seen = MAX(last_seen, ?2), pageviews = pageviews + ?3, plays = plays + ?4, listen_secs = listen_secs + ?5,
           human = MAX(human, ?6), bot_reason = COALESCE(bot_reason, ?7)
         WHERE session = ?1`,
      )
      .bind(session, lastTs, pageviews, plays, listen, human, reason),
  );
  for (const e of events) {
    statements.push(
      db
        .prepare("INSERT INTO events (ts, day, session, visitor, type, path, station, station_name, value, label) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)")
        .bind(e.ts, utcDay(e.ts), session, visitor, e.type, e.path, e.station, e.station_name, e.value, e.label),
    );
  }
  await db.batch(statements);
  return { ok: true };
}

const CRAWLERS: [RegExp, string][] = [
  [/Googlebot|Google-InspectionTool|GoogleOther|Storebot-Google|AdsBot-Google|Mediapartners-Google/i, "Google"],
  [/bingbot|BingPreview|msnbot/i, "Bing"],
  [/YandexBot|YandexImages/i, "Yandex"],
  [/DuckDuckBot|DuckAssistBot/i, "DuckDuckGo"],
  [/Baiduspider/i, "Baidu"],
  [/Applebot/i, "Apple"],
  [/facebookexternalhit|meta-externalagent|Facebot/i, "Meta"],
  [/Twitterbot/i, "X"],
  [/GPTBot|OAI-SearchBot|ChatGPT-User/i, "OpenAI"],
  [/ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai/i, "Anthropic"],
  [/PerplexityBot|Perplexity-User/i, "Perplexity"],
  [/AhrefsBot|SemrushBot|MJ12bot|DotBot|DataForSeoBot|serpstatbot/i, "SEO tools"],
];

/** Which crawler fetched a page, or null for a browser. */
export function crawlerName(ua: string): string | null {
  for (const [re, name] of CRAWLERS) if (re.test(ua)) return name;
  return isbot(ua) ? "Other bots" : null;
}

export async function recordCrawl(db: D1Database, bot: string) {
  await db
    .prepare("INSERT INTO crawls (day, bot, hits) VALUES (?1, ?2, 1) ON CONFLICT(day, bot) DO UPDATE SET hits = hits + 1")
    .bind(utcDay(), bot)
    .run();
}
