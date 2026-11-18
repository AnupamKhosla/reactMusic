import { env } from "cloudflare:workers";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/dashboard";
import { CountMeToggle } from "~/components/CountMeToggle";
import { Container } from "~/components/ui";
import { hasPassword, isOwner, login, logoutCookies } from "~/lib/auth.server";
import { countryName } from "~/lib/names";
import { loadDashboard, type Dashboard, type Kpis, type Row } from "~/lib/stats.server";

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export function meta() {
  return [{ title: "Visitors | LiveRadio" }, { name: "robots", content: "noindex, nofollow" }];
}

export function headers() {
  return { "Cache-Control": "private, no-store" };
}

export async function loader({ request }: Route.LoaderArgs) {
  if (!hasPassword()) return { state: "setup" as const };
  if (!(await isOwner(request))) return { state: "login" as const };
  const days = Number(new URL(request.url).searchParams.get("days")) || 7;
  const range = RANGES.find((r) => r.days === days)?.days ?? 7;
  const dashboard = await loadDashboard(env.DB, range);
  return { state: "ok" as const, dashboard };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  if (form.get("intent") === "logout") {
    const headers = new Headers();
    for (const cookie of logoutCookies()) headers.append("Set-Cookie", cookie);
    return redirect("/dashboard", { headers });
  }
  const cookie = await login(request, String(form.get("password") ?? ""));
  if (!cookie) return data({ error: "That password is not right." }, { status: 401 });
  return redirect("/dashboard", { headers: { "Set-Cookie": cookie } });
}

function duration(secs: number): string {
  if (!secs) return "0 min";
  if (secs < 60) return `${secs} s`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} min`;
}

function change(now: number, before: number): { text: string; up: boolean | null } {
  if (!before) return { text: now ? "new" : "–", up: now ? true : null };
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct === 0 ? null : pct > 0 };
}

function Kpi({ label, value, now, before, note }: { label: string; value: string; now: number; before?: number; note?: string }) {
  const c = before === undefined ? null : change(now, before);
  return (
    <div className="rounded-xl border-2 border-line p-4">
      <p className="caps text-muted">{label}</p>
      <p className="display mt-2 text-[2.4rem] leading-none">{value}</p>
      <p className="mt-2 text-sm text-muted">
        {c ? (
          <>
            <span className={`num font-medium ${c.up === true ? "text-[#1d7a3e] dark:text-[#5fd08a]" : c.up === false ? "text-red-ink" : ""}`}>{c.text}</span> vs
            the period before
            {note ? " · " : ""}
          </>
        ) : null}
        {note}
      </p>
    </div>
  );
}

function Table({ title, head, rows, empty = "Nothing yet." }: { title: string; head: string[]; rows: (string | number)[][]; empty?: string }) {
  return (
    <section className="rounded-xl border-2 border-line p-4">
      <h2 className="caps mb-3 text-muted">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {head.map((h, i) => (
                <th key={h} scope="col" className={`caps pb-2 font-medium text-muted ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hair">
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className={`py-2 ${j > 0 ? "num text-right" : "max-w-[16rem] truncate pr-3"}`} title={j === 0 ? String(cell) : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function DailyChart({ daily }: { daily: Dashboard["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.people));
  const w = 100 / daily.length;
  const labelEvery = daily.length > 31 ? 14 : daily.length > 8 ? 5 : 1;
  return (
    <figure className="rounded-xl border-2 border-line p-4">
      <figcaption className="flex flex-wrap items-center gap-4">
        <span className="caps text-muted">Real people each day</span>
        <span className="flex items-center gap-1.5 text-sm">
          <i className="inline-block h-3 w-3 rounded-sm bg-ink" aria-hidden="true" /> visited
        </span>
        <span className="flex items-center gap-1.5 text-sm">
          <i className="inline-block h-3 w-3 rounded-sm bg-red" aria-hidden="true" /> listened
        </span>
      </figcaption>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-4 h-48 w-full" role="img" aria-label="Bar chart of real people and listeners per day">
        {daily.map((d, i) => {
          const hp = (d.people / max) * 38;
          const hl = (d.listeners / max) * 38;
          return (
            <g key={d.day}>
              <title>{`${d.day}: ${d.people} people, ${d.listeners} listened, ${duration(d.secs)}`}</title>
              <rect x={i * w + w * 0.12} y={40 - hp} width={w * 0.38} height={hp} fill="var(--ink)" />
              <rect x={i * w + w * 0.5} y={40 - hl} width={w * 0.38} height={hl} fill="var(--red)" />
            </g>
          );
        })}
      </svg>
      <div className="relative mt-1 h-5">
        {daily.map((d, i) =>
          i % labelEvery === 0 || i === daily.length - 1 ? (
            <span key={d.day} className="num absolute -translate-x-1/2 text-[0.68rem] text-muted" style={{ left: `${(i + 0.5) * w}%` }}>
              {d.day.slice(5)}
            </span>
          ) : null,
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Show as numbers</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col" className="text-right">People</th>
              <th scope="col" className="text-right">Listened</th>
              <th scope="col" className="text-right">Listening time</th>
              <th scope="col" className="text-right">All visits</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.day} className="num">
                <td>{d.day}</td>
                <td className="text-right">{d.people}</td>
                <td className="text-right">{d.listeners}</td>
                <td className="text-right">{duration(d.secs)}</td>
                <td className="text-right">{d.all}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const TRAFFIC_LABELS: Record<string, string> = {
  real: "Real people (tapped, clicked, typed or scrolled)",
  quiet: "Opened a page, no interaction (people who left at once, or simple bots)",
  "bot:ua": "Bots that say they are bots",
  "bot:headless": "Automated browsers",
  "bot:webdriver": "Remote-controlled browsers",
  "bot:datacenter": "From hosting companies' networks",
};

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function rows(list: Row[], label: (key: string) => string = (k) => k || "(none)") {
  return list.map((r) => [label(r.key), r.visits, r.extra ?? 0]);
}

function DashboardView({ d }: { d: Dashboard }) {
  const k: Kpis = d.kpis;
  const p: Kpis = d.previous;
  const totalVisits = d.traffic.reduce((a, t) => a + t.visits, 0);
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Time range" className="flex gap-1">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              to={`/dashboard?days=${r.days}`}
              aria-current={r.days === d.days ? "page" : undefined}
              className={`caps rounded-full border px-3.5 py-2 ${r.days === d.days ? "border-ink bg-ink text-paper" : "border-line hover:bg-paper-2"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <p className="caps ml-auto flex items-center gap-2" aria-live="polite">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red" aria-hidden="true" />
          Right now: <span className="num">{d.nowPeople}</span> on the site · <span className="num">{d.nowListening}</span> listening
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Real people" value={String(k.people)} now={k.people} before={p.people} note={`${k.visits} visits`} />
        <Kpi label="Listened to a station" value={String(k.listeners)} now={k.listeners} before={p.listeners} note={`${pct(k.listeners, k.people)} of people`} />
        <Kpi
          label="Listening time"
          value={duration(k.listen_secs)}
          now={k.listen_secs}
          before={p.listen_secs}
          note={k.listeners ? `${duration(Math.round(k.listen_secs / k.listeners))} per listener` : undefined}
        />
        <Kpi label="Came back" value={String(d.returning)} now={d.returning} note={`${pct(d.returning, k.people)} had visited on an earlier day`} />
        <Kpi label="Pages viewed" value={String(k.pageviews)} now={k.pageviews} before={p.pageviews} note={k.visits ? `${(k.pageviews / k.visits).toFixed(1)} per visit` : undefined} />
        <Kpi
          label="Stayed (2+ pages or played)"
          value={pct(k.engaged_visits, k.visits)}
          now={k.engaged_visits}
          before={p.engaged_visits}
          note={`${k.engaged_visits} of ${k.visits} visits`}
        />
      </div>

      <div className="mt-6">
        <DailyChart daily={d.daily} />
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <Table
          title="All visits, people and bots"
          head={["Kind", "Visits", "Share"]}
          rows={d.traffic.map((t) => [TRAFFIC_LABELS[t.kind] ?? t.kind, t.visits, pct(t.visits, totalVisits)])}
        />
        <Table title="Where real people came from" head={["Source", "Visits", "Listened"]} rows={rows(d.sources)} />
        <Table title="Countries" head={["Country", "Visits", "Listened"]} rows={rows(d.countries, (c) => (c ? countryName(c) : "Unknown"))} />
        <Table title="First page of the visit" head={["Page", "Visits", "Listened"]} rows={rows(d.landings)} />
        <Table title="Pages viewed" head={["Page", "Views", "People"]} rows={rows(d.pages)} />
        <Table title="Devices" head={["Device", "Visits", "Listened"]} rows={rows(d.devices)} />
        <Table
          title="Stations listened to"
          head={["Station", "Plays", "Time", "Failed"]}
          rows={d.stations.map((s) => [s.name || s.station, s.plays, duration(s.secs), s.errors])}
        />
        <Table
          title="Searches"
          head={["Search", "Times", "Results"]}
          rows={d.searches.map((s) => [s.term, s.times, s.results])}
          empty="No searches yet. A search with 0 results shows what people want and we don't have."
        />
        <Table
          title="Playback"
          head={["What happened", "Count", "Share"]}
          rows={[
            ["Pressed play", d.playback.attempts, "100%"],
            ["Sound started", d.playback.started, pct(d.playback.started, d.playback.attempts)],
            ...d.playback.errors.map((e) => [
              e.label === "insecure" ? "Failed: stream blocked on a secure site" : e.label === "timeout" ? "Failed: too slow to start" : "Failed: station not answering",
              e.n,
              pct(e.n, d.playback.attempts),
            ]),
          ]}
        />
        <Table
          title="Search engines and AI crawlers (page fetches)"
          head={["Crawler", "Pages"]}
          rows={d.crawlers.map((c) => [c.bot, c.hits])}
          empty="No crawler visits counted yet."
        />
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="max-w-2xl text-sm text-ink-2">
          <h2 className="caps mb-2 text-muted">How these numbers are counted</h2>
          <p>
            A visit counts as a <strong>real person</strong> only after a real tap, click, key press or scroll, from a browser that is not a known bot,
            not remote-controlled and not on a hosting company's network. "Came back" means the same browser visited on an earlier day. People are
            counted by a random number kept in their browser, so the same person on two devices counts twice. Days are in UTC. Ad blockers can hide
            some visits.
          </p>
        </div>
        <CountMeToggle label="Count my own visits from this browser" />
      </section>
      <Form method="post" className="mt-8">
        <button type="submit" name="intent" value="logout" className="caps cursor-pointer text-muted underline hover:text-ink">
          Sign out of the dashboard
        </button>
      </Form>
    </>
  );
}

export default function Stats({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  return (
    <Container className="pb-10">
      <h1 className="display pt-8 text-[2.8rem] sm:text-[3.6rem]">Visitors</h1>
      {loaderData.state === "setup" ? (
        <div className="mt-6 max-w-xl rounded-xl border-2 border-dashed border-line p-6">
          <p className="font-semibold">The dashboard has no password yet.</p>
          <p className="mt-2 text-ink-2">
            Set one (8 characters or more) as the <code className="num">STATS_PASSWORD</code> secret of the site, then reload this page. Visits are
            already being counted.
          </p>
        </div>
      ) : loaderData.state === "login" ? (
        <Form method="post" className="mt-6 max-w-sm">
          <label htmlFor="stats-password" className="block font-semibold">
            Password
          </label>
          <input
            id="stats-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 h-12 w-full rounded-lg border-2 border-line bg-paper px-3"
            aria-describedby={actionData?.error ? "stats-error" : undefined}
          />
          {actionData?.error ? (
            <p id="stats-error" role="alert" className="mt-2 text-red-ink">
              {actionData.error}
            </p>
          ) : null}
          <button type="submit" className="caps mt-4 h-12 cursor-pointer rounded-full bg-ink px-6 text-paper" disabled={navigation.state !== "idle"}>
            {navigation.state !== "idle" ? "Checking…" : "Open the dashboard"}
          </button>
        </Form>
      ) : (
        <DashboardView d={loaderData.dashboard} />
      )}
    </Container>
  );
}
