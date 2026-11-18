// Station logos: many are missing, broken or a 1x1 pixel. A logo that loads gets data-loaded (the frame stops
// pulsing); one that fails gets data-broken (hidden, so the station's initials show).
function settle(img: HTMLImageElement) {
  if (!img.parentElement?.classList.contains("logo-frame")) return;
  if (!img.complete) return;
  // Some sites answer with a tiny pixel instead of an error.
  if (img.naturalWidth < 8) img.setAttribute("data-broken", "");
  else img.setAttribute("data-loaded", "");
}

export function initLogos() {
  // Load and error events don't bubble; listening in the capture phase catches every image, also later ones.
  document.addEventListener("load", (e) => e.target instanceof HTMLImageElement && settle(e.target), true);
  document.addEventListener(
    "error",
    (e) => {
      if (e.target instanceof HTMLImageElement && e.target.parentElement?.classList.contains("logo-frame")) e.target.setAttribute("data-broken", "");
    },
    true,
  );
}

/** Images that finished before this script ran (or before a page was put in place) fire no event: check them. */
export function settleLogos(root: ParentNode = document) {
  for (const img of root.querySelectorAll<HTMLImageElement>(".logo-frame > img")) settle(img);
}
