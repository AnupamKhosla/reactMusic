# Owner requests

Newest first. Status: open / done / waiting (on the owner).

## 2026-11-17 (after the first v2 look)

- done (submitting waits for Google's DNS to see Cloudflare): give Google a lightweight sitemap of the main pages
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
