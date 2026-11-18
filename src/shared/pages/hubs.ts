// The A-to-Z pages: all countries, all genres, all languages.
import { html } from "../html.ts";
import { formatCount, paths } from "../names.ts";
import { definePage } from "../page.ts";
import { getCountries, getGenres, getLanguages } from "../radio.ts";
import { breadcrumbLd, STATIC_CACHE } from "../seo.ts";
import { breadcrumbs, chips, container, pageHeading, section } from "../ui.ts";

export const countriesPage = definePage({
  pattern: "/countries",
  async load() {
    return { countries: await getCountries() };
  },
  render({ countries }) {
    const groups = new Map<string, typeof countries>();
    for (const c of [...countries].sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const letter = c.name[0].toUpperCase();
      const list = groups.get(letter);
      if (list) list.push(c);
      else groups.set(letter, [c]);
    }
    return {
      cache: STATIC_CACHE,
      seo: {
        title: "Radio Stations by Country – Listen Live Online",
        description: `Live radio from ${countries.length} countries. Pick a country and listen to its stations for free, with no sign-up and no app.`,
        path: "/countries",
        jsonLd: [
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Countries", path: "/countries" },
          ]),
        ],
      },
      body: container(html`${breadcrumbs([{ name: "Home", path: "/" }, { name: "Countries" }])}${pageHeading("Radio by country", {
        kicker: html`<span class="num">${countries.length}</span> countries`,
        intro: html`<p>Every country with a live station on air, A to Z. Or turn the <a href="/" class="underline">dial on the home page</a> to hear what's popular in each one.</p>`,
      })}
<nav aria-label="Jump to a letter" class="mt-10 flex flex-wrap gap-1">${[...groups.keys()].map(
        (letter) => html`<a href="#letter-${letter}" class="num grid h-9 w-9 place-items-center rounded border border-line hover:bg-ink hover:text-paper">${letter}</a>`,
      )}</nav>
<div class="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3 xl:columns-4">${[...groups.entries()].map(
        ([letter, list]) =>
          html`<section id="letter-${letter}" aria-labelledby="h-${letter}" class="mb-8 break-inside-avoid scroll-mt-6"><h2 id="h-${letter}" class="display mb-2 border-b border-line pb-1 text-3xl">${letter}</h2><ul>${list.map(
            (c) =>
              html`<li><a href="${paths.country(c.slug)}" class="group flex items-baseline gap-2 py-1.5"><span class="num w-7 flex-none text-[0.72rem] text-muted">${c.code}</span><span class="flex-1 group-hover:underline">${c.name}</span><span class="num text-sm text-muted">${formatCount(c.count)}</span></a></li>`,
          )}</ul></section>`,
      )}</div>`),
    };
  },
});

export const genresPage = definePage({
  pattern: "/genres",
  async load() {
    const genres = await getGenres();
    const all = genres.map((g) => ({ to: paths.genre(g.slug), label: g.label, count: g.count }));
    return { top: all.slice(0, 48), rest: all.slice(48, 400).sort((a, b) => a.label.localeCompare(b.label, "en")), total: genres.length };
  },
  render({ top, rest, total }) {
    const names = top
      .slice(0, 5)
      .map((g) => g.label.toLowerCase())
      .join(", ");
    return {
      cache: STATIC_CACHE,
      seo: {
        title: "Radio Stations by Genre – Listen Live Online",
        description: `Find live radio by genre: ${names || "pop, rock, news, jazz"} and hundreds more. Free, no sign-up, no app.`,
        path: "/genres",
        jsonLd: [
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Genres", path: "/genres" },
          ]),
        ],
      },
      body: container(html`${breadcrumbs([{ name: "Home", path: "/" }, { name: "Genres" }])}${pageHeading("Find your sound", {
        kicker: html`<span class="num">${total}</span> genres`,
        intro: html`<p>From news and talk to jazz, k-pop and lo-fi. The number on each genre is how many stations play it.</p>`,
      })}${section("Most played", chips(top, "Most played genres"))}${rest.length > 0 ? section("More genres, A to Z", chips(rest, "More genres")) : ""}`),
    };
  },
});

export const languagesPage = definePage({
  pattern: "/languages",
  async load() {
    const languages = await getLanguages();
    const all = languages.map((l) => ({ to: paths.language(l.slug), label: l.label, count: l.count }));
    return { top: all.slice(0, 40), rest: all.slice(40).sort((a, b) => a.label.localeCompare(b.label, "en")), total: languages.length };
  },
  render({ top, rest, total }) {
    return {
      cache: STATIC_CACHE,
      seo: {
        title: "Radio Stations by Language – Listen Live Online",
        description: `Live radio in ${total} languages, from English, Spanish and Hindi to Welsh and Yoruba. Free, no sign-up, no app.`,
        path: "/languages",
        jsonLd: [
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Languages", path: "/languages" },
          ]),
        ],
      },
      body: container(html`${breadcrumbs([{ name: "Home", path: "/" }, { name: "Languages" }])}${pageHeading("Radio by language", {
        kicker: html`<span class="num">${total}</span> languages`,
        intro: html`<p>Hear the world in its own words. The number on each language is how many stations broadcast in it.</p>`,
      })}${section("Most spoken on air", chips(top, "Most common languages"))}${rest.length > 0 ? section("More languages, A to Z", chips(rest, "More languages")) : ""}`),
    };
  },
});
