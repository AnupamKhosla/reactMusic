# Owner requests

Newest first. Status: open / done / waiting (on the owner).

## 2026-11-18 (night IST) — a static site, not pages built on every visit

Owner, after the Workers CPU email (GPTBot crawling thousands of station pages, each rendered fresh by the Worker):
"all the website should have been static front end react code, for ssr and seo we could have had prerendered all
possible pages locally in our mac and create a build or something. soon google gonna crawl our pages too."
- open (plan waiting for the owner's OK): pages are built ahead of time into plain files that Cloudflare serves
  without running the Worker (free, unlimited); the Worker only keeps the visit counter and the dashboard. Free
  plan limit: 20,000 files per deploy, so the main pages plus the ~15,000 most-listened stations as files; the rest
  of the station pages are built in the visitor's browser from one shared file. A rebuild refreshes the data.
- done: the project moved out of `chess-ai/tmp/` to its own folder, `~/Desktop/Projects/liveradio`.
- done (live 18 Nov): username + password on /dashboard; WAF rules (dashboard human check, scanner/probe block);
  GPTBot and `?sort=` copies out of robots.txt; login cookie fix.

## 2026-11-17 (after go-live) — for later, not bugs

Owner: "not a bug no light theme and the design is typical opus styling not original. we will fix these later just
note em".

- open: no light theme. The site only follows the device's light/dark setting, so on a dark-mode device there is
  no way to see or choose the light look. Give the visitor a light theme they can pick.
- open: the design reads as typical AI-model ("Opus") styling, not original. LiveRadio needs its own original
  look, not the generic one this build has.

## 2026-11-17 (after the first v2 look)

- done (submitted in Search Console 17 Nov, status Success; indexing requested for /, /countries, /genres,
  /languages, /top): give Google a lightweight sitemap of the main pages
  first, so a new site with thousands of look-alike station pages isn't taken for spam; get the main pages indexed
  first, then grow the sitemap in steps. `/sitemap.xml` now lists only `main.xml` (56 addresses); stages in the
  README, "Sitemap stages".

- done: dashboard moved from `/stats` to `/dashboard`.
- waiting: the dashboard password. Owner asked for one command for it: `npm run set-password` (a hidden Mac
  dialog, asks twice; README, "Going live"). Until it is run, `/dashboard` stays locked.
- done: the home page dial can be grabbed and dragged with the mouse, swiped, clicked, or turned with the arrow
  buttons and keys. The country under the needle is tuned and its stations show below on the same page; the address
  becomes `/?country=<slug>` (Back and shared links work). It opens on the visitor's own country.
- done: the dial and the "On air now · stations · countries" line meet WCAG 2.2 contrast, measured by
  `scripts/contrast.mjs` (dial text 8.6–16:1, top line 9.9:1).
- done: every station card opens its station page (the whole card is the link; Cmd/Ctrl/middle click opens a new tab).
- done: loading skeletons for pages, lists, the dial's stations and logos (still with reduced motion).
- done: publish live on Cloudflare's free plan. Worker deployed, D1 database live, liveradio.space added as a
  Free-plan zone with its DNS records, Always Use HTTPS on, Worker routes on liveradio.space and www, and (owner:
  "you do it") the GoDaddy nameservers switched to `damon.ns.cloudflare.com` and `paige.ns.cloudflare.com`
  (signed in with the owner's Google account; DNSSEC was off). Left: turn off the old GitHub Pages and submit the
  sitemap once the zone is active.
