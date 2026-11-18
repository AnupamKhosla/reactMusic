// What a page is: load its data (waiting on the directory, which costs no CPU), then render it (plain string
// building, a fraction of a millisecond). The Worker runs both for a direct visit; the browser runs both when
// the visitor opens another page inside the site.
import type { Html } from "./html.ts";
import type { Seo } from "./seo.ts";

export type PageContext = {
  url: URL;
  params: Record<string, string>;
  /**
   * The visitor's country code, when known: in the Worker from the connection; in the browser from the page the
   * visit started on, or else guessed from the browser's language. Only the home page dial uses it.
   */
  visitorCountry: string;
};

export type Rendered = {
  seo: Seo;
  body: Html;
  /** Cache-Control for the Worker's response. */
  cache: string;
  status?: number;
  /** Something for the visit counter to record once the page is shown (a search and its result count). */
  track?: { type: "search"; label: string; value: number };
};

export type PageDef<Data> = {
  /** Path pattern, e.g. "/country/:slug". */
  pattern: string;
  load(ctx: PageContext): Promise<Data | Redirect>;
  render(data: Data, ctx: PageContext): Rendered;
};

export class Redirect {
  readonly to: string;
  readonly status: 301 | 302;
  constructor(to: string, status: 301 | 302 = 301) {
    this.to = to;
    this.status = status;
  }
}

/** A page that doesn't exist (an unknown country, a station that left the directory, ?page=999). */
export class NotFound extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFound";
  }
}

export function definePage<Data>(def: PageDef<Data>): PageDef<unknown> {
  return def as PageDef<unknown>;
}
