# Owner requests

Newest first. Status: open / done / waiting (on the owner).

## 2026-11-17 (after the first v2 look)

- done: dashboard moved from `/stats` to `/dashboard`.
- waiting: the dashboard password. The owner sets it with
  `npx wrangler secret put STATS_PASSWORD` (README, "Going live"); until then `/dashboard` stays locked.
- done: the home page dial can be grabbed and dragged with the mouse, swiped, clicked, or turned with the arrow
  buttons and keys. The country under the needle is tuned and its stations show below on the same page; the address
  becomes `/?country=<slug>` (Back and shared links work). It opens on the visitor's own country.
- done: the dial and the "On air now · stations · countries" line meet WCAG 2.2 contrast, measured by
  `scripts/contrast.mjs` (dial text 8.6–16:1, top line 9.9:1).
- done: every station card opens its station page (the whole card is the link; Cmd/Ctrl/middle click opens a new tab).
- done: loading skeletons for pages, lists, the dial's stations and logos (still with reduced motion).
- waiting: publish live on Cloudflare's free plan. Done: Worker deployed, D1 database live, liveradio.space added as
  a Free-plan zone with its DNS records, Always Use HTTPS on, Worker routes on liveradio.space and www. Waiting:
  the owner switches the nameservers at GoDaddy to `damon.ns.cloudflare.com` and `paige.ns.cloudflare.com`
  (GoDaddy needs the owner's own sign-in).
