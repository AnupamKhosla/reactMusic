# LiveRadio (v2)

Live radio from every country, free in the browser: https://liveradio.space

v2 replaces the one-page React app (everything behind `?search=…&filter=…&page=…`) with a server-rendered
site where every country, genre, language and station has its own address, plus a private visitor dashboard.

## What changed from v1

- **Real pages, rendered on the server.** `/country/india`, `/genre/jazz`, `/language/hindi`,
  `/station/<name>-<id>`, `/top`, `/countries`, `/genres`, `/languages`, `/search?q=`, `/favorites`, `/about`,
  `/privacy`. Search engines get finished HTML with a title, description, canonical link, Open Graph/Twitter
  tags and JSON-LD (WebSite, BreadcrumbList, ItemList, RadioStation) on every page.
- **History API navigation.** Moving between pages never reloads the document (React Router), so the player
  keeps playing. Back/forward, bookmarks and shared links all work.
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
npm run dev                         # http://localhost:5173
```

Checks:

```sh
npm run typecheck
bash scripts/smoke.sh http://localhost:5173        # every page type: status, title, canonical
node scripts/nav-check.mjs http://localhost:5173   # no reloads between pages, player keeps playing
node scripts/dial-check.mjs http://localhost:5173  # dial drag/click/keys, card links, back button, skeletons
node scripts/shots.mjs http://localhost:5173       # headless screenshots into .smoke/
node scripts/contrast.mjs                          # WCAG 2.2 contrast of every colour pair, both schemes
node scripts/cpu-check.mjs https://liveradio.space # live CPU ms per page (reads `wrangler tail`)
npm run preview                                    # the production build in the Workers runtime
```

(The browser scripts need the `playwright` package; they run headless.)

## How it works

- React Router 8 (framework mode, SSR) on a Cloudflare Worker (`workers/app.ts`), built with Vite.
- Station data: the free, community-run Radio Browser directory, read on the server only
  (`app/lib/radio.server.ts`). Its mirrors are discovered at run time; answers are cached at the edge
  (`cf.cacheTtl`) and in memory.
- Pages are cached at Cloudflare's edge for 10 minutes (lists) or a day (static pages); the cache key holds the
  build version, so a deploy never serves pages that point at old scripts. The edge cache only works on the
  custom domain, not on `*.workers.dev`.
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
5. Once the zone shows "Active" in Cloudflare: check the site, then turn off GitHub Pages for the old repo, and
   submit `https://liveradio.space/sitemap.xml` in Google Search Console (the domain is already verified there
   by its TXT record).

`workers_dev` is off, so the `*.workers.dev` copy of the site no longer answers (no duplicate pages for search
engines).

Free-plan limits: Workers 100,000 requests a day and 10 ms of CPU per request; D1 5 million reads and 100,000
writes a day, 5 GB. Measured on 17 Nov (`node scripts/cpu-check.mjs <url>`): a page served from the edge cache
costs 0–1 ms; a page rendered fresh costs 20–40 ms, and the first request of a new Worker instance 60–80 ms.
Cloudflare let every one of them through (outcome "ok"); it tolerates occasional overruns but may stop a Worker
that is over the limit all the time with error 1102. The edge cache keeps most visits at 0–1 ms. If 1102 errors
ever show up in the Worker's logs, the cure is rendering less per page (or the paid plan, the owner's call).

## Known limits

- Some stations stream only over plain `http://`, which browsers block on an `https` page. The player tries
  `https://` first; if that fails it says so and offers the stream in a new tab.
- Station names, logos, tags and languages come from the directory and are sometimes wrong or missing; a
  missing logo shows the station's initials.
- The privacy page has no contact address yet: add one before launch.
