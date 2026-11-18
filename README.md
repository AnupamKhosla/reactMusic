# LiveRadio (v3, light)

Live radio from every country, free in the browser: https://liveradio.space

v3 (branch `v3-light`, 18–19 Nov 2026) keeps every page and address of v2 but drops React and React Router: the
pages are plain template functions that build HTML strings, run by the Worker for direct visits and by the browser
for pages opened inside the site. Why: v2 needed 15–45 ms of Worker CPU per fresh page against the free plan's
10 ms, and Cloudflare stopped thousands of requests a day (18 Nov). v3 builds a page in 0.04–0.2 ms (3 ms for the
very first page of a new Worker instance), measured on the Mac with `npm run bench`.

## How v3 works

```
src/shared/   templates for every page (html.ts, ui.ts, layout.ts, pages/*), the address table (router.ts),
              the station directory client (radio.ts), SEO tags (seo.ts). Runs in the Worker AND the browser.
src/worker/   the Worker: pages, edge cache, sitemaps, robots.txt, /api/collect, /dashboard (index.ts)
src/client/   the browser script: page changes inside the site, player, favourites, dial (main.ts)
src/styles.css
```

- **Direct visit (address typed, link from Google, reload):** the Worker matches the address (`router.ts`), asks
  the directory for the data, fills the page's template and sends finished HTML with every SEO tag. The page
  carries `<script id="lr-state">` with `"rendered": "server"`, the stations on it and when it was built.
- **The browser script** sees `"server"` and leaves the content alone (no React-style "hydration": it doesn't
  rebuild anything). It only adds one click listener and sets attributes for this visitor: which station plays,
  which hearts are filled (`sync.ts`).
- **Clicking a link inside the site:** the browser asks the directory for the next page's data itself (the Worker
  is not involved), builds the page with the same templates, and only then changes the address (History API) and
  shows it. Meanwhile the current page stays and a thin red bar shows after 150 ms. Back/Forward show pages seen
  in the last 5 minutes at once. The document is never reloaded, so the player keeps playing (`nav.ts`).
- **Errors everywhere:** a directory that doesn't answer gives the "station list is busy" page (503, never
  cached, with Try again); unknown addresses give a real 404; redirects (old v1 addresses, renamed stations) are
  301s on the Worker and `replaceState` in the browser; a page that takes over 12 s counts as busy.
- **Caching (like Next.js incremental static regeneration):** the Worker keeps each page in Cloudflare's edge
  cache. A copy younger than its `s-maxage` (10 min for lists, a day for fixed pages) is served as it is; an older
  one is still served at once, and the Worker rebuilds it in the background for the next visitor
  (`cached()` in `src/worker/index.ts`). Each deploy starts a fresh cache (the key holds the version).
  Backstop in the browser: a page more than 10 minutes old is rebuilt there in the background and only the parts
  that changed are updated (`morph.ts`); if nothing changed, nothing moves.
- **Plain hosting without a Worker** (GitHub Pages or any file server): `npm run build:static` writes `dist/static`
  with the same script and an empty frame as `index.html` and `404.html` (`"rendered": "shell"`). The browser
  then builds whatever page the address names, showing a skeleton only if that takes over 500 ms. Limits there:
  crawlers that don't run JavaScript see an empty page, deep addresses answer with HTTP 404 (the page still
  shows), and there's no visit counting or dashboard. Test it with `node scripts/serve-static.ts`.
- Static files (script, stylesheet, fonts, icons, manifest) are Cloudflare static assets: free and never run the
  Worker. The browser script is 27 KB compressed; hls.js (180 KB) loads only for HLS stations.

## What v2 changed from v1 (still true)

- **Real pages, rendered on the server.** `/country/india`, `/genre/jazz`, `/language/hindi`,
  `/station/<name>-<id>`, `/top`, `/countries`, `/genres`, `/languages`, `/search?q=`, `/favorites`, `/about`,
  `/privacy`. Search engines get finished HTML with a title, description, canonical link, Open Graph/Twitter
  tags and JSON-LD (WebSite, BreadcrumbList, ItemList, RadioStation) on every page.
- **History API navigation.** Moving between pages never reloads the document, so the player keeps playing.
  Back/forward, bookmarks and shared links all work.
- **One persistent player** at the bottom: play/pause, previous/next through the list it was started from,
  favourite, volume, lock-screen and headphone controls (Media Session), HLS streams, plain error messages.
- **Favourites and recently played** stay in the visitor's browser (no account).
- **SEO plumbing:** `/sitemap.xml` (pages, countries, genres, languages, the 5,000 most listened-to stations),
  `/robots.txt`, `/manifest.webmanifest`, 301s from v1 addresses and from alternate slugs
  (`/country/in` → `/country/india`), real 404s, `noindex` on search results and re-sorted lists, internal
  links between related countries, genres and languages.
- **Visitor dashboard** at `/dashboard` (password): see below.
- **The dial (home page):** countries on a lit radio dial with a red needle. Grab and drag it with the mouse,
  swipe it, or use the arrow buttons or arrow keys; the country that comes to rest under the needle is tuned and
  its stations are listed below, on the same page, with the address updated to `/?country=<slug>` (Back and
  shared links work, like v1's `pushState` search). It opens on the visitor's own country.
- **Station cards:** the whole card opens the station page in place; Cmd/Ctrl-click opens a new tab.
- **Skeletons:** pulsing placeholders while a page, a list page or the dial's stations load (still when the
  visitor prefers less motion), like v1's loading cards.
- **Design:** "tuning dial in print": warm paper, black ink, one red needle; Fraunces / Instrument Sans /
  IBM Plex Mono, self-hosted (no Google Fonts call). Dark scheme follows the device. Every text and control
  colour meets WCAG 2.2 AA in both schemes: `node scripts/contrast.mjs` measures them (dial text 8.6–16:1).
  The logo was traced from an AI-generated raster into a 600-byte SVG (`public/icon.svg`, `public/favicon.svg`).

## Run it locally

```sh
npm install
cp .dev.vars.example .dev.vars      # local dashboard password
npm run db:local                    # creates the local stats tables
npm run dev                         # builds the browser script, then http://localhost:8787 (no edge cache)
```

(`npm run dev` doesn't rebuild the browser script on changes: run `npm run build` again, or `npx vite build
--watch` in a second terminal.)

Checks:

```sh
npm run typecheck                                  # browser + shared code, then the Worker (two configs)
npm run bench                                      # page build time and HTML size on this Mac
bash scripts/smoke.sh http://localhost:8787        # every page type: status, title, canonical
npm run build:static && node scripts/serve-static.ts   # the no-Worker version on http://localhost:8788
node scripts/contrast.mjs                          # WCAG 2.2 contrast of every colour pair, both schemes
node scripts/cpu-check.mjs https://liveradio.space # live CPU ms per page (reads `wrangler tail`)
```

(`smoke.sh` asks for `/dashboard` as curl, which the Worker answers with 404 on purpose; it opens in a browser.
`nav-check.mjs`, `dial-check.mjs` and `shots.mjs` were written for v2 and need the `playwright` package.)

## Data and storage

- Station data: the free, community-run Radio Browser directory (`src/shared/radio.ts`), read by the Worker and,
  for pages opened inside the site, by the visitor's browser (it allows that). Its mirrors are discovered at run
  time; the Worker's requests are cached by Cloudflare (`cf.cacheTtl`) and both keep answers in memory.
- Stats: Cloudflare D1 (SQLite), tables in `migrations/0001_stats.sql`.

## The visitor dashboard (`/dashboard`)

Answers "do real people come, and do they listen?":

- Real people, visits, listeners, total and per-listener listening time, people who came back on another day,
  pages per visit, and the change against the previous period. Ranges: today, 7, 30, 90 days.
- Right now: people on the site and people listening.
- A daily chart; where visitors came from (Google, Facebook, Reddit, `utm_source`…); countries; first page;
  pages viewed; devices; the stations people listened to and for how long; searches (a search with 0 results
  is a station people want that we don't have); how often a stream fails and why.
- All visits split into real people, visits with no interaction, and bots (by kind), and how often Google,
  Bing, the AI crawlers and SEO tools fetch pages.

"Real person" = a visit with a real tap, click, key press or scroll, from a browser that isn't a known bot,
an automated/remote-controlled browser or a hosting company's network. No cookies and no IP addresses are
stored; a random id in the visitor's browser tells new from returning visitors (session-only when the browser
sends Global Privacy Control). Anyone can switch counting off for their browser on `/privacy`; switch it off
in your own browsers on `/dashboard` so your visits don't count.

## Going live (all on free plans)

State on 2026-11-17:

1. Done: `wrangler login`; D1 database `liveradio` created (its id is in `wrangler.jsonc`); `npm run db:remote`
   applied the stats tables; `npm run deploy` deployed the Worker.
2. Done: liveradio.space added to Cloudflare as a Free-plan zone. Its DNS records were imported (the old GitHub
   Pages A records, `www`, the `_dmarc` and google-site-verification TXT records); Always Use HTTPS is on; the
   Worker serves `liveradio.space/*` and `www.liveradio.space/*` (`routes` in `wrangler.jsonc`; www redirects
   to the bare domain).
3. Done: at GoDaddy (the registrar; the domain **expires 23 Dec 2026**; DNSSEC off) the nameservers were set to
   `damon.ns.cloudflare.com` and `paige.ns.cloudflare.com`. Until the switch reaches everyone (minutes to a
   day), some visitors still get the old GitHub Pages site; both work, and v1 addresses 301 to v2 pages.
   `node scripts/wait-nameservers.mjs` waits until the registry and the site have switched.
4. **Owner:** the dashboard password: `npm run set-password`. A Mac dialog asks for it twice with the typing
   hidden (8+ characters) and saves it on Cloudflare as the Worker's `STATS_PASSWORD` secret; it is never printed
   or stored in the repo. Run it again any time to change the password. Until it is set, `/dashboard` stays locked.
5. Done, 17 Nov: the zone is active and the site is live (smoke test passes on liveradio.space; www and http
   301 to https://liveradio.space). In Google Search Console (domain property, verified by its TXT record)
   `https://liveradio.space/sitemap.xml` is submitted (status Success), and indexing was requested for `/`,
   `/countries`, `/genres`, `/languages` and `/top`.
6. Left, on the owner's yes: turn off GitHub Pages for the old repo (nothing reaches it once DNS caches expire;
   it's only cleanup).

### Sitemap stages (owner, 2026-11-17)

Google gets the site in steps, so a new domain with thousands of look-alike station pages isn't taken for spam:
the main pages first, more only once most of them are indexed. `SITEMAP_STAGE` in `src/worker/sitemap.ts`
decides what `/sitemap.xml` lists:

| Stage | `/sitemap.xml` lists | About |
| --- | --- | --- |
| 1 (now) | `main.xml`: the 6 hubs, the 20 biggest countries, 20 well-known genres, 10 biggest languages | 56 addresses |
| 2 | every hub, country and language page | ~410 (224 countries, 182 languages on 17 Nov) |
| 3 | + every genre page with 20+ stations | +~580 |
| 4, 5, … | + one station file (500 stations) per stage, 10 files in all | +500 each |

Move up one stage (edit the number, deploy) only when Search Console's Pages report shows most of the current
stage indexed, and not more than about once a week. Pages outside the sitemap still work and are linked from the
site; they are just not pushed to Google.

`workers_dev` is off, so the `*.workers.dev` copy of the site no longer answers (no duplicate pages for search
engines).

Free-plan limits: Workers 100,000 requests a day and 10 ms of CPU per request; D1 5 million reads and 100,000
writes a day, 5 GB. Measured on 17 Nov (`node scripts/cpu-check.mjs <url>`): a page served from the edge cache
costs 0–1 ms; a page rendered fresh costs 20–40 ms, and the first request of a new Worker instance 60–80 ms.
Cloudflare let every one of them through (outcome "ok"); it tolerates occasional overruns but may stop a Worker
that is over the limit all the time with error 1102. The edge cache keeps most visits at 0–1 ms. If 1102 errors
ever show up in the Worker's logs, the cure is rendering less per page (or the paid plan, the owner's call).

18 Nov 2026: Cloudflare's "Workers CPU limit exceeded" email (1,000+ a day). Last 24 h: 32,708 Worker requests,
2,931 stopped for CPU (9%, mostly `?sort=` list pages). By user agent: GPTBot 26,440 (77%, nearly all distinct
`/station/…` pages, so every one missed the edge cache and was rendered fresh), a config-file scanner from NL
(`TLM-Audit-Scanner`) 4,292 probing `.env`/`.php`/`.json` paths that each rendered the full 404 page, AhrefsBot
1,316, and only a few hundred people. Fixes: robots.txt shuts out GPTBot (OAI-SearchBot and ChatGPT-User stay
allowed) and `?sort=` copies for every crawler; the Worker answers scanner names and probe paths with a plain 404/403
before any rendering; /dashboard returns 404 to crawlers and isn't named in robots.txt. Figures came from the
dashboard's GraphQL analytics (`workersInvocationsAdaptive`, zone `httpRequestsAdaptiveGroups` by userAgent).

Cloudflare WAF custom rules on the zone (Free plan, 2 of 5; added 18 Nov 2026 with the owner's yes). They run before
the Worker, so whatever they stop costs no Worker requests or CPU. Security → Security rules, or the
`http_request_firewall_custom` entrypoint ruleset. To rebuild them:
1. "Owner dashboard: human check before the Worker runs": Managed Challenge when
   `starts_with(lower(http.request.uri.path), "/dashboard")`.
2. "Block vulnerability scanners and config-file probes": Block when the user agent contains TLM-Audit-Scanner,
   CMS-Security-Auditor, zgrab, sqlmap, nikto or Nuclei, or the lower-cased path ends with .env .php .yml .yaml .toml
   .ini .sql .bak .old .log .cfg .conf .config .asp .aspx .jsp .cgi .csv .zip .gz .tar .rar .pem .key .sh .py .json,
   or contains /.git /.env /.aws /.ssh phpmyadmin, or starts with /wp- /cgi-bin /vendor/ /node_modules.
   (Free plans have no regex in rules, hence the long `or` list.)

## Known limits

- Some stations stream only over plain `http://`, which browsers block on an `https` page. The player tries
  `https://` first; if that fails it says so and offers the stream in a new tab.
- Station names, logos, tags and languages come from the directory and are sometimes wrong or missing; a
  missing logo shows the station's initials.
- The privacy page has no contact address yet: add one before launch.
