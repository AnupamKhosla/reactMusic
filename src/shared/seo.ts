// One place for every page's title, description, canonical link, social preview and structured data.
// The Worker writes these tags into the page; the browser swaps them when it opens another page inside the site.
import { html, jsonScript, type Html } from "./html.ts";

export const SITE_NAME = "LiveRadio";
export const SITE_URL = "https://liveradio.space";
export const DEFAULT_DESCRIPTION =
  "Listen to thousands of live radio stations from every country for free. Music, news, talk and sport, no sign-up, no app.";

export type Seo = {
  title: string;
  description?: string;
  /** Path with query, e.g. "/country/india?page=2". */
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>[];
  /** Adds "| LiveRadio" unless the title already names the site. */
  brand?: boolean;
};

export function absolute(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function fullTitle(seo: Seo): string {
  return seo.brand !== false && !seo.title.includes(SITE_NAME) ? `${seo.title} | ${SITE_NAME}` : seo.title;
}

function shortDescription(description: string): string {
  return description.length > 160 ? `${description.slice(0, 157).replace(/\s+\S*$/, "")}…` : description;
}

/** The page-specific <head> tags. Each carries data-seo, so the browser can replace exactly these. */
export function headTags(seo: Seo): Html {
  const { title, path, image = "/og.png", noindex, jsonLd = [] } = seo;
  const url = absolute(path);
  const desc = shortDescription(seo.description ?? DEFAULT_DESCRIPTION);
  const img = absolute(image);
  return html`<title>${fullTitle(seo)}</title>
<meta data-seo name="description" content="${desc}">
<link data-seo rel="canonical" href="${url}">
<meta data-seo property="og:site_name" content="${SITE_NAME}">
<meta data-seo property="og:type" content="website">
<meta data-seo property="og:title" content="${title}">
<meta data-seo property="og:description" content="${desc}">
<meta data-seo property="og:url" content="${url}">
<meta data-seo property="og:image" content="${img}">
<meta data-seo property="og:image:width" content="1200">
<meta data-seo property="og:image:height" content="630">
<meta data-seo property="og:locale" content="en_US">
<meta data-seo name="twitter:card" content="summary_large_image">
<meta data-seo name="twitter:title" content="${title}">
<meta data-seo name="twitter:description" content="${desc}">
<meta data-seo name="twitter:image" content="${img}">
${noindex ? html`<meta data-seo name="robots" content="noindex, follow">` : ""}
${jsonLd.map((block) => html`<script data-seo type="application/ld+json">${jsonScript(block)}</script>`)}`;
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absolute(item.path) })),
  };
}

/** A list of stations on a page, so search engines see what the page lists. */
export function stationListLd(name: string, stations: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: stations.length,
    itemListElement: stations.slice(0, 30).map((s, i) => ({ "@type": "ListItem", position: i + 1, url: absolute(s.path), name: s.name })),
  };
}

/**
 * Meta for a sorted, paged list. Only the default order is indexed (other orders are the same stations
 * shuffled); later pages are indexed with their own address.
 */
export function listSeo(input: {
  title: string;
  description: string;
  base: string;
  sort: string;
  page: number;
  crumbs: { name: string; path: string }[];
  stations: { name: string; path: string }[];
}): Seo {
  const sorted = input.sort !== "popular";
  const paged = input.page > 1;
  return {
    title: paged ? `${input.title} – Page ${input.page}` : input.title,
    description: input.description,
    path: paged && !sorted ? `${input.base}?page=${input.page}` : input.base,
    noindex: sorted,
    jsonLd: [breadcrumbLd(input.crumbs), stationListLd(input.title, input.stations)],
  };
}

/** Pages that list stations: shared by browsers for a minute, by the edge for ten. */
export const LIST_CACHE = "public, max-age=60, s-maxage=600, stale-while-revalidate=3600";
export const STATIC_CACHE = "public, max-age=60, s-maxage=86400, stale-while-revalidate=86400";
export const SEARCH_CACHE = "public, max-age=60, s-maxage=300";
export const NO_STORE = "no-store";
