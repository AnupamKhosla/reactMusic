// Sorting and paging of station lists, shared by the server (loaders) and the pages.
import type { CardStation, Station } from "./types";

export const PER_PAGE = 48;

export const SORTS = [
  { key: "popular", label: "Popular now", order: "clickcount" },
  { key: "trending", label: "Trending", order: "clicktrend" },
  { key: "votes", label: "Most liked", order: "votes" },
  { key: "az", label: "A–Z", order: "name" },
] as const;

export type Sort = (typeof SORTS)[number];
export type SortKey = Sort["key"];

export function parseSort(value: string | null): Sort {
  return SORTS.find((s) => s.key === value) ?? SORTS[0];
}

export function parsePage(value: string | null): number {
  const n = Number(value ?? 1);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : 0;
}

/** Builds "/country/india?sort=trending&page=2", leaving out the defaults. */
export function listHref(base: string, sort: SortKey, page: number): string {
  const p = new URLSearchParams();
  if (sort !== "popular") p.set("sort", sort);
  if (page > 1) p.set("page", String(page));
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

/** Only what a station card and the player need, to keep pages small. */
export function toCard(s: Station): CardStation {
  return {
    id: s.id,
    name: s.name,
    stream: s.stream,
    hls: s.hls,
    favicon: s.favicon,
    countrycode: s.countrycode,
    country: s.country,
    tags: s.tags.slice(0, 3),
    codec: s.codec,
    bitrate: s.bitrate,
    homepage: s.homepage,
    clicks: s.clicks,
  };
}

/** Counts how often each value appears and returns the most common ones. */
export function mostCommon(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([v]) => v);
}
