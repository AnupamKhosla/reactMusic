// The whole site's HTML is built with this one tagged template, in the Worker (direct page loads) and in the
// browser (pages opened inside the site). Every value put into a template is escaped unless it is already Html,
// so a station name like `<script>` shows as text and can never become code.

export class Html {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

export type Part = string | number | Html | null | undefined | false | Part[];

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const NEEDS_ESCAPE = /[&<>"']/;
const ESCAPE_ALL = /[&<>"']/g;

export function escape(text: string): string {
  // Most text has nothing to escape: skip the replace then (this runs thousands of times per page).
  return NEEDS_ESCAPE.test(text) ? text.replace(ESCAPE_ALL, (c) => ESCAPES[c]) : text;
}

function write(value: Part): string {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) {
    let out = "";
    for (const v of value) out += write(v);
    return out;
  }
  return escape(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Part[]): Html {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += write(values[i]) + strings[i + 1];
  return new Html(out);
}

/** Text that is already safe HTML (only for strings this code wrote itself, never for directory data). */
export function trusted(text: string): Html {
  return new Html(text);
}

// U+2028 and U+2029, written as escapes so the source file holds no invisible characters.
const LINE_SEPARATORS = new RegExp("[\\u2028\\u2029]", "g");

/** JSON inside a <script> tag: "</script>" and similar can't end the tag early. */
export function jsonScript(value: unknown): Html {
  return new Html(JSON.stringify(value).replace(/</g, "\\u003c").replace(LINE_SEPARATORS, (c) => (c === "\u2028" ? "\\u2028" : "\\u2029")));
}

/** Class names from a list, skipping the empty ones. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
