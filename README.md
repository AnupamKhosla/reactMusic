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
- **Visitor dashboard** at `/stats` (password): see below.
- **Design:** "tuning dial in print": warm paper, black ink, one red needle; Fraunces / Instrument Sans /
  IBM Plex Mono, self-hosted (no Google Fonts call). The home page dial lists countries on a frequency scale.
  Dark scheme follows the device. Text colours meet WCAG 2.2 AA (body ~14:1, muted ≥ 5:1, red text 5.5:1).
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
node scripts/shots.mjs http://localhost:5173       # headless screenshots into .smoke/
npm run preview                                    # the production build in the Workers runtime
```

(The two `.mjs` scripts need the `playwright` package; they run headless.)

## How it works

- React Router 8 (framework mode, SSR) on a Cloudflare Worker (`workers/app.ts`), built with Vite.
- Station data: the free, community-run Radio Browser directory, read on the server only
  (`app/lib/radio.server.ts`). Its mirrors are discovered at run time; answers are cached at the edge
  (`cf.cacheTtl`) and in memory.
- Pages are cached at Cloudflare's edge for 10 minutes (lists) or a day (static pages); the cache key holds the
  build version, so a deploy never serves pages that point at old scripts. The edge cache only works on the
  custom domain, not on `*.workers.dev`.
- Stats: Cloudflare D1 (SQLite), tables in `migrations/0001_stats.sql`.

## The visitor dashboard (`/stats`)

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
in your own browsers on `/stats` so your visits don't count.

## Going live (all on free plans)

Nothing below has been done yet. Each step is the owner's.

1. `npx wrangler login`
2. `npx wrangler d1 create liveradio`, then paste the printed `database_id` into `wrangler.jsonc`
   under `d1_databases`.
3. `npm run db:remote` (creates the stats tables in the live database).
4. `npx wrangler secret put STATS_PASSWORD` (8+ characters; typed into the prompt, never stored in the repo).
5. `npm run deploy`. Try it on the `liveradio.<account>.workers.dev` address it prints.
6. The domain: liveradio.space is registered at GoDaddy (**expires 23 Dec 2026**) and today points at the
   old GitHub Pages site. Add it to Cloudflare (free plan), switch the nameservers at GoDaddy to the two
   Cloudflare gives you, then uncomment `routes` in `wrangler.jsonc` and run `npm run deploy` again.
   Afterwards turn off GitHub Pages for the old repo.
7. Google Search Console: add the domain, submit `https://liveradio.space/sitemap.xml`.

Free-plan limits: Workers 100,000 requests a day and 10 ms of CPU per request (the edge cache keeps most page
views from rendering at all); D1 5 million reads and 100,000 writes a day, 5 GB.

## Known limits

- Some stations stream only over plain `http://`, which browsers block on an `https` page. The player tries
  `https://` first; if that fails it says so and offers the stream in a new tab.
- Station names, logos, tags and languages come from the directory and are sometimes wrong or missing; a
  missing logo shows the station's initials.
- The privacy page has no contact address yet: add one before launch.
