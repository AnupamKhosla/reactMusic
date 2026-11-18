// Pages with fixed text, and the favourites page (its stations live in the visitor's browser and are filled in
// there: src/client/personal.ts).
import { html } from "../html.ts";
import { definePage } from "../page.ts";
import { STATIC_CACHE } from "../seo.ts";
import { breadcrumbs, container, pageHeading, section } from "../ui.ts";

export const aboutPage = definePage({
  pattern: "/about",
  async load() {
    return {};
  },
  render() {
    return {
      cache: STATIC_CACHE,
      seo: {
        title: "About LiveRadio",
        description: "LiveRadio is a free way to listen to live radio from every country in your browser, with no sign-up and no app.",
        path: "/about",
      },
      body: container(
        html`${breadcrumbs([{ name: "Home", path: "/" }, { name: "About" }])}${pageHeading("Radio without borders.", { kicker: "About" })}
<div class="mt-8 space-y-5 text-lg text-ink-2">
<p>LiveRadio puts tens of thousands of live stations from around the world one tap away: national broadcasters, city and community stations, college radio and internet-only channels. It is free, it works in any modern browser, and there is nothing to install.</p>
<p>Stations come from a free, community-kept directory of radio streams, and the lists are ordered by how many people are listening today, so the stations people actually enjoy come first. Stations that stop answering are left out until they are back on air.</p>
<p>The music and talk come straight from each broadcaster. LiveRadio does not host, record or change any audio, and every station belongs to its owner.</p>
<h2 class="display pt-4 text-2xl text-ink">Tips</h2>
<ul class="list-disc space-y-2 pl-6">
<li>Tap the heart on a station to keep it in your favourites. They stay on this device.</li>
<li>The player keeps playing while you browse other pages, and works with your headphones' and lock screen's play buttons.</li>
<li>Each station page shows the stream address, so you can also listen in your own music player.</li>
</ul>
<p class="pt-4"><a href="/privacy" class="underline">How LiveRadio handles privacy</a></p>
</div>`,
        "max-w-3xl",
      ),
    };
  },
});

const PRIVACY: [string, string[]][] = [
  [
    "The short version",
    [
      "LiveRadio has no accounts, no ads and no tracking cookies. We never ask for your name or email address.",
      "Your favourites, recently played stations and volume are saved in your own browser. They are never sent to us.",
    ],
  ],
  [
    "What we count",
    [
      "To see whether people find the site useful, the site counts visits anonymously: which pages are opened, which stations are played and for how long, searches typed into the search box, the site you came from, your country (worked out from your connection, without keeping your IP address), and the kind of device and browser.",
      "To tell new visitors from returning ones, your browser keeps a random number made up on your device. It is not linked to your name, your email or anything else about you. If your browser sends a Global Privacy Control signal, that number lasts only until you close the tab.",
      "You can switch counting off for this browser below. Clearing your browser's site data removes the random number too.",
    ],
  ],
  [
    "Stations and their logos",
    [
      "When you press play, the audio comes straight from the station's own server, and station logos load from the stations' own websites. Like any website, those servers can see your IP address. Their own privacy policies apply.",
    ],
  ],
];

/** The switch for the anonymous visit counting; the browser script sets it from this browser's choice. */
export function countMeToggle(label = "Count my visits in the anonymous visitor numbers") {
  return html`<label class="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-line p-4"><input type="checkbox" data-count-me class="h-5 w-5 accent-[var(--red)]" checked disabled><span>${label}<span class="block text-sm text-muted" data-count-me-note>On for this browser.</span></span></label>`;
}

export const privacyPage = definePage({
  pattern: "/privacy",
  async load() {
    return {};
  },
  render() {
    return {
      cache: STATIC_CACHE,
      seo: { title: "Privacy", description: "What LiveRadio keeps and counts: no accounts, no tracking cookies, favourites stay on your device.", path: "/privacy" },
      body: container(
        html`${breadcrumbs([{ name: "Home", path: "/" }, { name: "Privacy" }])}${pageHeading("Privacy", { kicker: "Updated 17 November 2026" })}
<div class="mt-8 space-y-10">${PRIVACY.map(
          ([title, paragraphs]) => html`<section><h2 class="display text-2xl">${title}</h2>${paragraphs.map((p) => html`<p class="mt-3 text-ink-2">${p}</p>`)}</section>`,
        )}${countMeToggle()}</div>`,
        "max-w-3xl",
      ),
    };
  },
});

export const favoritesPage = definePage({
  pattern: "/favorites",
  async load() {
    return {};
  },
  render() {
    return {
      cache: "public, max-age=60, s-maxage=86400",
      seo: { title: "Your favourite stations", path: "/favorites", noindex: true },
      body: container(
        html`${pageHeading("Your stations", {
          kicker: "Saved on this device",
          intro: html`<p>Favourites and recently played stations are kept in this browser only. Nobody else can see them, and there is no account to make.</p>`,
        })}${section("Favourites", html`<div data-personal="favorites"></div>`, {
          action: html`<button type="button" data-clear-favorites hidden class="caps cursor-pointer text-muted hover:text-ink hover:underline">Clear all</button>`,
        })}<div data-personal="recent-all"></div>`,
      ),
    };
  },
});
