# Owner requests

Newest first. Status: open / done.

## 2026-11-17 (after the first v2 look)

- open: dashboard moves from `/stats` to `/dashboard`; explain how the owner sets its password.
- open: the home page dial can be grabbed and dragged with the mouse (touch already scrolls). Picking a country on it
  stays on the home page and shows that country's stations below it, like v1 did (v1 kept one page and changed the
  list under the search box, with the address updated through `pushState`).
- open: the dial and the "51.7K stations · 224 countries · On air now" line must be easy to read: WCAG 2.2 contrast,
  measured.
- open: every station card opens its station page (a real link: normal click in place, new tab with Cmd/Ctrl/middle click).
- open: loading skeletons like v1 had (v1 pulsed placeholders while a list loaded).
- open: publish everything live, on Cloudflare's free plan only.
