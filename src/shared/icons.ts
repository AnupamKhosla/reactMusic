// Every icon of the site: 24x24, drawn in currentColor so it follows the text colour in both schemes.
// Each drawing is in the page once (iconSprite(), in the layout); every use of it is a short <use> reference, so a
// page of 48 cards doesn't repeat the same drawings 150 times.
import { trusted, type Html } from "./html.ts";

const PATHS = {
  play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  pause:
    '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
  next: '<path d="M5 5.5v13l9.5-6.5z" fill="currentColor" stroke="none"/><path d="M18 5.5v13" stroke-width="2.4"/>',
  prev: '<path d="M19 5.5v13l-9.5-6.5z" fill="currentColor" stroke="none"/><path d="M6 5.5v13" stroke-width="2.4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/>',
  arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  // Filled when its button sets --heart-fill (a favourite): CSS variables reach inside <use>, selectors don't.
  heart: '<path style="fill:var(--heart-fill,none)" d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  muted: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  spinner: '<path d="M12 3a9 9 0 1 0 9 9"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** The drawings, once per page (hidden). */
export const iconSprite: Html = trusted(
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${Object.entries(PATHS)
    .map(([name, paths]) => `<symbol id="i-${name}" viewBox="0 0 24 24">${paths}</symbol>`)
    .join("")}</svg>`,
);

// Icons are the same few strings over and over: build each size once.
const made = new Map<string, Html>();

export function icon(name: IconName, size = 20, className = ""): Html {
  const key = `${name}|${size}|${className}`;
  let svg = made.get(key);
  if (!svg) {
    const cls = name === "spinner" ? `animate-spin motion-reduce:animate-none ${className}`.trim() : className;
    svg = trusted(
      `<svg width="${size}" height="${size}" class="icon${cls ? ` ${cls}` : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`,
    );
    made.set(key, svg);
  }
  return svg;
}

/** The LiveRadio mark: a dial scale with the red needle (traced from the logo artwork, public/icon.svg). */
export function logoMark(size = 32): Html {
  return trusted(
    `<svg width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><rect width="512" height="512" rx="98" fill="var(--bar)"/><g fill="var(--on-bar)"><rect x="64" y="176" width="44" height="176" rx="22"/><rect x="152" y="232" width="44" height="88" rx="22"/><rect x="340" y="232" width="44" height="88" rx="22"/><rect x="420" y="176" width="44" height="176" rx="22"/></g><g fill="var(--red)"><rect x="236" y="164" width="44" height="268" rx="22"/><path d="M196 72h124l-62 88z"/></g></svg>`,
  );
}
