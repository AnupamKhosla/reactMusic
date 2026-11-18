// /dashboard: the owner's visitor numbers, behind a username and password (auth.ts). Plain forms: logging in and out
// are POSTs to /dashboard that answer with a redirect (or the form again with an error).
import { html, type Html } from "../shared/html.ts";
import { countryName } from "../shared/names.ts";
import { countMeToggle } from "../shared/pages/info.ts";
import { container } from "../shared/ui.ts";
import { hasPassword, isOwner, login, logoutCookies } from "./auth.ts";
import { loadDashboard, type Dashboard, type Kpis, type Row } from "./stats.ts";

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export type DashboardResult = { type: "page"; status: number; body: Html } | { type: "redirect"; headers: Headers };

function duration(secs: number): string {
  if (!secs) return "0 min";
  if (secs < 60) return `${secs} s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} min`;
}

function change(now: number, before: number): { text: string; up: boolean | null } {
  if (!before) return { text: now ? "new" : "–", up: now ? true : null };
  const p = Math.round(((now - before) / before) * 100);
  return { text: `${p > 0 ? "+" : ""}${p}%`, up: p === 0 ? null : p > 0 };
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function kpi(label: string, value: string, now: number, before?: number, note?: string): Html {
  const c = before === undefined ? null : change(now, before);
  const tone = c?.up === true ? "text-[#1d7a3e] dark:text-[#5fd08a]" : c?.up === false ? "text-red-ink" : "";
  return html`<div class="rounded-xl border-2 border-line p-4"><p class="caps text-muted">${label}</p><p class="display mt-2 text-[2.4rem] leading-none">${value}</p><p class="mt-2 text-sm text-muted">${
    c ? html`<span class="num font-medium ${tone}">${c.text}</span> vs the period before${note ? " · " : ""}` : ""
  }${note ?? ""}</p></div>`;
}

function table(title: string, head: string[], rows: (string | number)[][], empty = "Nothing yet."): Html {
  return html`<section class="rounded-xl border-2 border-line p-4"><h2 class="caps mb-3 text-muted">${title}</h2>${
    rows.length === 0
      ? html`<p class="text-muted">${empty}</p>`
      : html`<table class="w-full text-left text-sm"><thead><tr class="border-b border-line">${head.map(
          (h, i) => html`<th scope="col" class="caps pb-2 font-medium text-muted${i > 0 ? " text-right" : ""}">${h}</th>`,
        )}</tr></thead><tbody class="divide-y divide-hair">${rows.map(
          (r) =>
            html`<tr>${r.map((cell, j) =>
              j > 0 ? html`<td class="num py-2 text-right">${cell}</td>` : html`<td class="max-w-[16rem] truncate py-2 pr-3" title="${cell}">${cell}</td>`,
            )}</tr>`,
        )}</tbody></table>`
  }</section>`;
}

function dailyChart(daily: Dashboard["daily"]): Html {
  const max = Math.max(1, ...daily.map((d) => d.people));
  const w = 100 / Math.max(1, daily.length);
  const labelEvery = daily.length > 31 ? 14 : daily.length > 8 ? 5 : 1;
  return html`<figure class="rounded-xl border-2 border-line p-4"><figcaption class="flex flex-wrap items-center gap-4"><span class="caps text-muted">Real people each day</span><span class="flex items-center gap-1.5 text-sm"><i class="inline-block h-3 w-3 rounded-sm bg-ink" aria-hidden="true"></i> visited</span><span class="flex items-center gap-1.5 text-sm"><i class="inline-block h-3 w-3 rounded-sm bg-red" aria-hidden="true"></i> listened</span></figcaption>
<svg viewBox="0 0 100 40" preserveAspectRatio="none" class="mt-4 h-48 w-full" role="img" aria-label="Bar chart of real people and listeners per day">${daily.map((d, i) => {
    const hp = (d.people / max) * 38;
    const hl = (d.listeners / max) * 38;
    return html`<g><title>${d.day}: ${d.people} people, ${d.listeners} listened, ${duration(d.secs)}</title><rect x="${i * w + w * 0.12}" y="${40 - hp}" width="${w * 0.38}" height="${hp}" fill="var(--ink)"/><rect x="${
      i * w + w * 0.5
    }" y="${40 - hl}" width="${w * 0.38}" height="${hl}" fill="var(--red)"/></g>`;
  })}</svg>
<div class="relative mt-1 h-5">${daily.map((d, i) =>
    i % labelEvery === 0 || i === daily.length - 1
      ? html`<span class="num absolute -translate-x-1/2 text-[0.68rem] text-muted" style="left:${(i + 0.5) * w}%">${d.day.slice(5)}</span>`
      : "",
  )}</div>
<details class="mt-3 text-sm"><summary class="cursor-pointer text-muted">Show as numbers</summary><table class="mt-2 w-full text-left"><thead><tr><th scope="col">Day</th><th scope="col" class="text-right">People</th><th scope="col" class="text-right">Listened</th><th scope="col" class="text-right">Listening time</th><th scope="col" class="text-right">All visits</th></tr></thead><tbody>${daily.map(
    (d) =>
      html`<tr class="num"><td>${d.day}</td><td class="text-right">${d.people}</td><td class="text-right">${d.listeners}</td><td class="text-right">${duration(d.secs)}</td><td class="text-right">${d.all}</td></tr>`,
  )}</tbody></table></details></figure>`;
}

const TRAFFIC_LABELS: Record<string, string> = {
  real: "Real people (tapped, clicked, typed or scrolled)",
  quiet: "Opened a page, no interaction (people who left at once, or simple bots)",
  "bot:ua": "Bots that say they are bots",
  "bot:headless": "Automated browsers",
  "bot:webdriver": "Remote-controlled browsers",
  "bot:datacenter": "From hosting companies' networks",
};

function rows(list: Row[], label: (key: string) => string = (k) => k || "(none)") {
  return list.map((r) => [label(r.key), r.visits, r.extra ?? 0]);
}

function view(d: Dashboard): Html {
  const k: Kpis = d.kpis;
  const p: Kpis = d.previous;
  const totalVisits = d.traffic.reduce((a, t) => a + t.visits, 0);
  return html`<div class="mt-6 flex flex-wrap items-center gap-3"><nav aria-label="Time range" class="flex gap-1">${RANGES.map(
    (r) =>
      html`<a href="/dashboard?days=${r.days}" class="caps rounded-full border px-3.5 py-2 ${r.days === d.days ? "border-ink bg-ink text-paper" : "border-line hover:bg-paper-2"}"${
        r.days === d.days ? html` aria-current="page"` : ""
      }>${r.label}</a>`,
  )}</nav><p class="caps ml-auto flex items-center gap-2"><span class="inline-block h-2.5 w-2.5 rounded-full bg-red" aria-hidden="true"></span>Right now: <span class="num">${d.nowPeople}</span> on the site · <span class="num">${
    d.nowListening
  }</span> listening</p></div>
<div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">${[
    kpi("Real people", String(k.people), k.people, p.people, `${k.visits} visits`),
    kpi("Listened to a station", String(k.listeners), k.listeners, p.listeners, `${pct(k.listeners, k.people)} of people`),
    kpi("Listening time", duration(k.listen_secs), k.listen_secs, p.listen_secs, k.listeners ? `${duration(Math.round(k.listen_secs / k.listeners))} per listener` : undefined),
    kpi("Came back", String(d.returning), d.returning, undefined, `${pct(d.returning, k.people)} had visited on an earlier day`),
    kpi("Pages viewed", String(k.pageviews), k.pageviews, p.pageviews, k.visits ? `${(k.pageviews / k.visits).toFixed(1)} per visit` : undefined),
    kpi("Stayed (2+ pages or played)", pct(k.engaged_visits, k.visits), k.engaged_visits, p.engaged_visits, `${k.engaged_visits} of ${k.visits} visits`),
  ]}</div>
<div class="mt-6">${dailyChart(d.daily)}</div>
<div class="mt-6 grid gap-3 lg:grid-cols-2">${[
    table(
      "All visits, people and bots",
      ["Kind", "Visits", "Share"],
      d.traffic.map((t) => [TRAFFIC_LABELS[t.kind] ?? t.kind, t.visits, pct(t.visits, totalVisits)]),
    ),
    table("Where real people came from", ["Source", "Visits", "Listened"], rows(d.sources)),
    table("Countries", ["Country", "Visits", "Listened"], rows(d.countries, (c) => (c ? countryName(c, c) : "Unknown"))),
    table("First page of the visit", ["Page", "Visits", "Listened"], rows(d.landings)),
    table("Pages viewed", ["Page", "Views", "People"], rows(d.pages)),
    table("Devices", ["Device", "Visits", "Listened"], rows(d.devices)),
    table(
      "Stations listened to",
      ["Station", "Plays", "Time", "Failed"],
      d.stations.map((s) => [s.name || s.station, s.plays, duration(s.secs), s.errors]),
    ),
    table(
      "Searches",
      ["Search", "Times", "Results"],
      d.searches.map((s) => [s.term, s.times, s.results]),
      "No searches yet. A search with 0 results shows what people want and we don't have.",
    ),
    table("Playback", ["What happened", "Count", "Share"], [
      ["Pressed play", d.playback.attempts, "100%"],
      ["Sound started", d.playback.started, pct(d.playback.started, d.playback.attempts)],
      ...d.playback.errors.map((e) => [
        e.label === "insecure" ? "Failed: stream blocked on a secure site" : e.label === "timeout" ? "Failed: too slow to start" : "Failed: station not answering",
        e.n,
        pct(e.n, d.playback.attempts),
      ]),
    ]),
    table("Search engines and AI crawlers (page fetches)", ["Crawler", "Pages"], d.crawlers.map((c) => [c.bot, c.hits]), "No crawler visits counted yet."),
  ]}</div>
<section class="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start"><div class="max-w-2xl text-sm text-ink-2"><h2 class="caps mb-2 text-muted">How these numbers are counted</h2><p>A visit counts as a <strong>real person</strong> only after a real tap, click, key press or scroll, from a browser that is not a known bot, not remote-controlled and not on a hosting company's network. "Came back" means the same browser visited on an earlier day. People are counted by a random number kept in their browser, so the same person on two devices counts twice. Days are in UTC. Ad blockers can hide some visits.</p></div>${countMeToggle(
    "Count my own visits from this browser",
  )}</section>
<form method="post" action="/dashboard" class="mt-8"><button type="submit" name="intent" value="logout" class="caps cursor-pointer text-muted underline hover:text-ink">Sign out of the dashboard</button></form>`;
}

function loginForm(error?: string): Html {
  const described = error ? html` aria-describedby="stats-error"` : "";
  const input = "mt-2 h-12 w-full rounded-lg border-2 border-line bg-paper px-3";
  return html`<form method="post" action="/dashboard" class="mt-6 max-w-sm"><label for="stats-username" class="block font-semibold">Username</label><input id="stats-username" name="username" type="text" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" class="${input}"${described}><label for="stats-password" class="mt-4 block font-semibold">Password</label><input id="stats-password" name="password" type="password" required autocomplete="current-password" class="${input}"${described}>${
    error ? html`<p id="stats-error" role="alert" class="mt-2 text-red-ink">${error}</p>` : ""
  }<button type="submit" class="caps mt-4 h-12 cursor-pointer rounded-full bg-ink px-6 text-paper">Open the dashboard</button></form>`;
}

function frame(content: Html): Html {
  return container(html`<h1 class="display pt-8 text-[2.8rem] sm:text-[3.6rem]">Visitors</h1>${content}`, "pb-10");
}

export async function dashboard(request: Request, db: D1Database): Promise<DashboardResult> {
  const url = new URL(request.url);
  if (request.method === "POST") {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return { type: "page", status: 400, body: frame(loginForm("That didn't arrive. Try again.")) };
    }
    const headers = new Headers({ Location: "/dashboard" });
    if (form.get("intent") === "logout") {
      for (const cookie of logoutCookies()) headers.append("Set-Cookie", cookie);
      return { type: "redirect", headers };
    }
    const cookie = await login(request, String(form.get("username") ?? ""), String(form.get("password") ?? ""));
    if (!cookie) return { type: "page", status: 401, body: frame(loginForm("That username or password is not right.")) };
    // Also clear the old cookie scoped to /dashboard, so it can't shadow the new one.
    headers.append("Set-Cookie", logoutCookies()[1]);
    headers.append("Set-Cookie", cookie);
    return { type: "redirect", headers };
  }

  if (!hasPassword()) {
    return {
      type: "page",
      status: 200,
      body: frame(
        html`<div class="mt-6 max-w-xl rounded-xl border-2 border-dashed border-line p-6"><p class="font-semibold">The dashboard has no username and password yet.</p><p class="mt-2 text-ink-2">Set them with <code class="num">npm run set-password</code> (a username of 3 characters or more and a password of 8 or more), then reload this page. Visits are already being counted.</p></div>`,
      ),
    };
  }
  if (!(await isOwner(request))) return { type: "page", status: 200, body: frame(loginForm()) };
  const days = Number(url.searchParams.get("days")) || 7;
  const range = RANGES.find((r) => r.days === days)?.days ?? 7;
  try {
    return { type: "page", status: 200, body: frame(view(await loadDashboard(db, range))) };
  } catch (error) {
    console.error("dashboard failed", String(error));
    return {
      type: "page",
      status: 500,
      body: frame(html`<p class="mt-6 text-red-ink" role="alert">The numbers didn't load. <a href="/dashboard" class="underline">Try again</a>.</p>`),
    };
  }
}
