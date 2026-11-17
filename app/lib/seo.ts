// One place for every page's title, description, canonical link, social preview and structured data.
// React Router uses only the deepest route's meta, so each page passes everything it needs through seo().
import type { MetaDescriptor } from "react-router";

export const SITE_NAME = "LiveRadio";
export const SITE_URL = "https://liveradio.space";
export const DEFAULT_DESCRIPTION =
  "Listen to thousands of live radio stations from every country for free. Music, news, talk and sport, no sign-up, no app.";

export type SeoInput = {
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

export function seo({ title, description = DEFAULT_DESCRIPTION, path, image = "/og.png", noindex, jsonLd = [], brand = true }: SeoInput): MetaDescriptor[] {
  const fullTitle = brand && !title.includes(SITE_NAME) ? `${title} | ${SITE_NAME}` : title;
  const url = absolute(path);
  const desc = description.length > 160 ? `${description.slice(0, 157).replace(/\s+\S*$/, "")}…` : description;
  const tags: MetaDescriptor[] = [
    { title: fullTitle },
    { name: "description", content: desc },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: desc },
    { property: "og:url", content: url },
    { property: "og:image", content: absolute(image) },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: desc },
    { name: "twitter:image", content: absolute(image) },
  ];
  if (noindex) tags.push({ name: "robots", content: "noindex, follow" });
  for (const block of jsonLd) tags.push({ "script:ld+json": block });
  return tags;
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: absolute(item.path) })),
  };
}

/** A list of stations on a page, so search engines see what the page lists. */
export function stationListLd(name: string, stations: { id: string; name: string; path: string }[]) {
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
  stations: { id: string; name: string; path: string }[];
}): MetaDescriptor[] {
  const sorted = input.sort !== "popular";
  const paged = input.page > 1;
  const path = paged && !sorted ? `${input.base}?page=${input.page}` : input.base;
  return seo({
    title: paged ? `${input.title} – Page ${input.page}` : input.title,
    description: input.description,
    path,
    noindex: sorted,
    jsonLd: [breadcrumbLd(input.crumbs), stationListLd(input.title, input.stations)],
  });
}

/** Pages that list stations: shared by browsers for a minute, by the edge for ten. */
export const LIST_CACHE = "public, max-age=60, s-maxage=600, stale-while-revalidate=3600";
export const STATIC_CACHE = "public, max-age=60, s-maxage=86400, stale-while-revalidate=86400";
