// Names, slugs and links shared by the server and the browser.

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** A slug for a free-text name that may have no latin letters (e.g. a Japanese genre). */
export function nameSlug(name: string): string {
  return slugify(name) || encodeURIComponent(name.trim().toLowerCase());
}

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}

const SHORT_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  RU: "Russia",
  KR: "South Korea",
  KP: "North Korea",
  IR: "Iran",
  SY: "Syria",
  VN: "Vietnam",
  LA: "Laos",
  TZ: "Tanzania",
  BO: "Bolivia",
  VE: "Venezuela",
  MD: "Moldova",
  TW: "Taiwan",
  CZ: "Czechia",
};

/** "IN" -> "India". Falls back to the directory's own (often long, official) name. */
export function countryName(code: string, fallback = ""): string {
  const cc = (code || "").toUpperCase();
  if (SHORT_NAMES[cc]) return SHORT_NAMES[cc];
  if (cc.length === 2 && regionNames) {
    try {
      const name = regionNames.of(cc);
      if (name && name !== cc) return name;
    } catch {
      /* unknown code */
    }
  }
  return titleCase(fallback) || cc;
}

const SMALL_WORDS = new Set(["of", "and", "the", "de", "la", "del", "da", "do"]);

/** "the united kingdom of great britain" -> "The United Kingdom of Great Britain" */
export function titleCase(text: string): string {
  return (text || "")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Two letters for a station without a logo: "BBC Radio 1" -> "BR". */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2);
  return letters.toUpperCase();
}

export const paths = {
  station: (s: { id: string; name: string }) => `/station/${slugify(s.name) || "station"}-${s.id}`,
  country: (slug: string) => `/country/${slug}`,
  genre: (slug: string) => `/genre/${slug}`,
  language: (slug: string) => `/language/${slug}`,
  search: (q: string) => `/search?q=${encodeURIComponent(q)}`,
};

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** "/station/bbc-radio-1-<uuid>" -> "<uuid>" */
export function stationIdFromSlug(slug: string): string | null {
  const m = UUID_AT_END.exec(slug || "");
  return m ? m[1].toLowerCase() : null;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}
