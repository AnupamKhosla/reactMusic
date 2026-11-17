// The numbers on /stats. "Real people" = visits with a real tap, click, key press or scroll, from a normal
// browser (not a known bot, an automated browser or a hosting company's network).
import { utcDay } from "./analytics.server";

const REAL = "human = 1 AND bot_reason IS NULL";

export type Kpis = {
  visits: number;
  people: number;
  new_visits: number;
  listening_visits: number;
  listeners: number;
  listen_secs: number;
  pageviews: number;
  engaged_visits: number;
};

export type Row = { key: string; visits: number; extra?: number };

export type Dashboard = {
  days: number;
  since: string;
  kpis: Kpis;
  previous: Kpis;
  returning: number;
  nowPeople: number;
  nowListening: number;
  traffic: { kind: string; visits: number }[];
  daily: { day: string; people: number; listeners: number; secs: number; all: number }[];
  sources: Row[];
  countries: Row[];
  landings: Row[];
  devices: Row[];
  pages: Row[];
  stations: { station: string; name: string; plays: number; secs: number; errors: number }[];
  searches: { term: string; times: number; results: number }[];
  playback: { attempts: number; started: number; errors: { label: string; n: number }[] };
  crawlers: { bot: string; hits: number }[];
};

const KPI_SQL = `SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor) AS people, COALESCE(SUM(is_new), 0) AS new_visits,
  COALESCE(SUM(CASE WHEN plays > 0 THEN 1 ELSE 0 END), 0) AS listening_visits,
  COUNT(DISTINCT CASE WHEN plays > 0 THEN visitor END) AS listeners,
  COALESCE(SUM(listen_secs), 0) AS listen_secs, COALESCE(SUM(pageviews), 0) AS pageviews,
  COALESCE(SUM(CASE WHEN pageviews >= 2 OR plays > 0 THEN 1 ELSE 0 END), 0) AS engaged_visits
  FROM sessions WHERE day >= ?1 AND day < ?2 AND ${REAL}`;

function grouped(column: string, extra = "SUM(CASE WHEN plays > 0 THEN 1 ELSE 0 END)") {
  return `SELECT COALESCE(${column}, '') AS key, COUNT(*) AS visits, ${extra} AS extra FROM sessions
    WHERE day >= ?1 AND ${REAL} GROUP BY key ORDER BY visits DESC LIMIT 12`;
}

export async function loadDashboard(db: D1Database, days: number): Promise<Dashboard> {
  const now = Date.now();
  const since = utcDay(now - (days - 1) * 86400_000);
  const prevSince = utcDay(now - (2 * days - 1) * 86400_000);
  const tomorrow = utcDay(now + 86400_000);

  const statements = [
    db.prepare(KPI_SQL).bind(since, tomorrow),
    db.prepare(KPI_SQL).bind(prevSince, since),
    db
      .prepare(
        `SELECT COUNT(DISTINCT s.visitor) AS n FROM sessions s JOIN visitors v ON v.visitor = s.visitor
         WHERE s.day >= ?1 AND s.human = 1 AND s.bot_reason IS NULL AND v.first_day < s.day`,
      )
      .bind(since),
    db.prepare(`SELECT COUNT(DISTINCT visitor) AS n FROM sessions WHERE last_seen > ?1 AND ${REAL}`).bind(now - 5 * 60_000),
    db
      .prepare(
        `SELECT COUNT(DISTINCT e.session) AS n FROM events e JOIN sessions s ON s.session = e.session
         WHERE e.ts > ?1 AND e.type IN ('playing', 'listen') AND s.bot_reason IS NULL`,
      )
      .bind(now - 3 * 60_000),
    db
      .prepare(
        `SELECT CASE WHEN bot_reason IS NOT NULL THEN 'bot:' || bot_reason WHEN human = 1 THEN 'real' ELSE 'quiet' END AS kind, COUNT(*) AS visits
         FROM sessions WHERE day >= ?1 GROUP BY kind ORDER BY visits DESC`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT day, COUNT(DISTINCT CASE WHEN ${REAL} THEN visitor END) AS people,
           COUNT(DISTINCT CASE WHEN ${REAL} AND plays > 0 THEN visitor END) AS listeners,
           COALESCE(SUM(CASE WHEN ${REAL} THEN listen_secs ELSE 0 END), 0) AS secs,
           COUNT(*) AS all_visits
         FROM sessions WHERE day >= ?1 GROUP BY day ORDER BY day`,
      )
      .bind(since),
    db.prepare(grouped("source")).bind(since),
    db.prepare(grouped("country")).bind(since),
    db.prepare(grouped("landing")).bind(since),
    db.prepare(grouped("device")).bind(since),
    db
      .prepare(
        `SELECT e.path AS key, COUNT(*) AS visits, COUNT(DISTINCT e.visitor) AS extra FROM events e JOIN sessions s ON s.session = e.session
         WHERE e.day >= ?1 AND e.type = 'pageview' AND s.human = 1 AND s.bot_reason IS NULL GROUP BY e.path ORDER BY visits DESC LIMIT 15`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT e.station AS station, MAX(e.station_name) AS name,
           SUM(CASE WHEN e.type = 'playing' THEN 1 ELSE 0 END) AS plays,
           SUM(CASE WHEN e.type = 'listen' THEN COALESCE(e.value, 0) ELSE 0 END) AS secs,
           SUM(CASE WHEN e.type = 'play_error' THEN 1 ELSE 0 END) AS errors
         FROM events e JOIN sessions s ON s.session = e.session
         WHERE e.day >= ?1 AND e.type IN ('playing', 'listen', 'play_error') AND e.station IS NOT NULL AND s.human = 1 AND s.bot_reason IS NULL
         GROUP BY e.station ORDER BY secs DESC, plays DESC LIMIT 15`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT e.label AS term, COUNT(*) AS times, CAST(ROUND(AVG(COALESCE(e.value, 0))) AS INTEGER) AS results
         FROM events e JOIN sessions s ON s.session = e.session
         WHERE e.day >= ?1 AND e.type = 'search' AND e.label IS NOT NULL AND s.bot_reason IS NULL
         GROUP BY e.label ORDER BY times DESC LIMIT 15`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT e.type AS type, COALESCE(e.label, '') AS label, COUNT(*) AS n FROM events e JOIN sessions s ON s.session = e.session
         WHERE e.day >= ?1 AND e.type IN ('play', 'playing', 'play_error') AND s.human = 1 AND s.bot_reason IS NULL GROUP BY e.type, label`,
      )
      .bind(since),
    db.prepare(`SELECT bot, SUM(hits) AS hits FROM crawls WHERE day >= ?1 GROUP BY bot ORDER BY hits DESC`).bind(since),
  ];

  const r = await db.batch(statements);
  const rows = <T,>(i: number) => (r[i].results ?? []) as T[];
  const first = <T,>(i: number) => rows<T>(i)[0];

  const dailyRows = rows<{ day: string; people: number; listeners: number; secs: number; all_visits: number }>(6);
  const byDay = new Map(dailyRows.map((d) => [d.day, d]));
  const daily: Dashboard["daily"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = utcDay(now - i * 86400_000);
    const d = byDay.get(day);
    daily.push({ day, people: d?.people ?? 0, listeners: d?.listeners ?? 0, secs: d?.secs ?? 0, all: d?.all_visits ?? 0 });
  }

  const playRows = rows<{ type: string; label: string; n: number }>(14);
  const sum = (type: string) => playRows.filter((p) => p.type === type).reduce((a, p) => a + p.n, 0);

  return {
    days,
    since,
    kpis: first<Kpis>(0),
    previous: first<Kpis>(1),
    returning: first<{ n: number }>(2)?.n ?? 0,
    nowPeople: first<{ n: number }>(3)?.n ?? 0,
    nowListening: first<{ n: number }>(4)?.n ?? 0,
    traffic: rows<{ kind: string; visits: number }>(5),
    daily,
    sources: rows<Row>(7),
    countries: rows<Row>(8),
    landings: rows<Row>(9),
    devices: rows<Row>(10),
    pages: rows<Row>(11),
    stations: rows<Dashboard["stations"][number]>(12),
    searches: rows<Dashboard["searches"][number]>(13),
    playback: {
      attempts: sum("play"),
      started: sum("playing"),
      errors: playRows.filter((p) => p.type === "play_error").map((p) => ({ label: p.label, n: p.n })),
    },
    crawlers: rows<{ bot: string; hits: number }>(15),
  };
}
