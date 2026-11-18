// The home page dial: countries on an old radio's frequency scale. Grab and drag it with the mouse, swipe it,
// scroll it, or use the arrow buttons or keys; the country that comes to rest under the red needle is "tuned" and
// its stations show below, fetched by the browser straight from the directory. Only ?country= in the address
// changes (replaceState), so Back still leaves the home page. Each country is a real link to its own page too.
import { formatCount, paths } from "../shared/names.ts";
import { tunedFailed, tunedList, tunedStations } from "../shared/pages/home.ts";
import { collectStations, moreLink, skeletonGrid } from "../shared/ui.ts";
import { settleLogos } from "./logos.ts";
import { rememberStations, syncPage } from "./sync.ts";

type DialCountry = { slug: string; code: string; name: string; count: number };
type Drag = { id: number; startX: number; startLeft: number; lastX: number; lastT: number; v: number; moved: boolean };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** The drawn list of each country already shown (for this tab), so turning back and forth costs nothing. */
const drawn = new Map<string, string>();

export function initDial(root: ParentNode = document) {
  const section = root.querySelector<HTMLElement>("[data-dial]");
  const found = section?.querySelector<HTMLUListElement>("#dial-list");
  if (!section || !found) return;
  const list: HTMLUListElement = found;
  const items = [...list.querySelectorAll<HTMLLIElement>(".dial-item")];
  const countries: DialCountry[] = items.map((li) => ({
    slug: li.dataset.slug ?? "",
    code: li.dataset.code ?? "",
    name: li.dataset.name ?? "",
    count: Number(li.dataset.count) || 0,
  }));
  if (countries.length === 0) return;

  let tuned = Math.max(
    0,
    items.findIndex((li) => li.hasAttribute("data-active")),
  );
  let centre = tuned;
  let drag: Drag | null = null;
  let settling = false;
  let dragEndedAt = 0;
  let request = 0;

  const itemWidth = () => items[0]?.offsetWidth || 144;
  const clamp = (i: number) => Math.min(countries.length - 1, Math.max(0, i));
  const indexNow = () => clamp(Math.round(list.scrollLeft / itemWidth()));

  const steps = [...section.querySelectorAll<HTMLButtonElement>("[data-dial-step]")];
  const showCentre = (i: number) => {
    if (i === centre && items[i]?.hasAttribute("data-active")) return;
    centre = i;
    items.forEach((li, j) => {
      li.toggleAttribute("data-active", j === i);
      li.querySelector("a")?.setAttribute("tabindex", j === i ? "0" : "-1");
    });
    for (const b of steps) b.disabled = Number(b.dataset.dialStep) < 0 ? i === 0 : i === countries.length - 1;
  };

  // Start with the tuned country under the needle (the page's inline script already did it during load).
  list.scrollLeft = tuned * itemWidth();
  showCentre(tuned);

  const status = document.querySelector<HTMLElement>("[data-tuned-status]");
  const slot = document.querySelector<HTMLElement>("[data-tuned-list]");
  const title = document.querySelector<HTMLElement>("#tuned-title");
  const more = document.querySelector<HTMLElement>("[data-tuned-more]");

  function draw(markup: string) {
    if (!slot) return;
    slot.innerHTML = markup;
    settleLogos(slot);
    syncPage(slot);
  }

  // The list the page arrived with.
  if (slot && countries[tuned]) drawn.set(countries[tuned].slug, slot.innerHTML);

  async function showStations(country: DialCountry) {
    const mine = ++request;
    if (title) title.textContent = `Popular in ${country.name}`;
    if (more) more.innerHTML = moreLink(paths.country(country.slug), `All ${formatCount(country.count)} stations`).value;
    const ready = drawn.get(country.slug);
    if (ready !== undefined) {
      draw(ready);
      if (status) status.textContent = `Showing stations from ${country.name}`;
      return;
    }
    if (status) status.textContent = `Loading stations from ${country.name}`;
    draw(skeletonGrid(12, `Loading stations from ${country.name}`).value);
    try {
      const stations = await tunedStations(country.code);
      const { result, stations: shown } = collectStations(() => tunedList(country, stations));
      rememberStations(shown);
      drawn.set(country.slug, result.value);
      if (mine !== request) return;
      draw(result.value);
      if (status) status.textContent = `Showing stations from ${country.name}`;
    } catch (error) {
      if (mine !== request) return;
      console.error("tuned stations failed", country.code, error);
      draw(tunedFailed(country).value);
      if (status) status.textContent = `Stations from ${country.name} didn't load`;
    }
  }

  function tune(i: number) {
    if (i === tuned) return;
    tuned = i;
    const country = countries[i];
    items.forEach((li, j) => li.querySelector("a")?.toggleAttribute("aria-current", j === i));
    const url = new URL(window.location.href);
    url.searchParams.set("country", country.slug);
    history.replaceState(history.state, "", url);
    void showStations(country);
  }

  function turnTo(i: number) {
    list.scrollTo({ left: clamp(i) * itemWidth(), behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function tuneAndTurn(i: number) {
    const target = clamp(i);
    tune(target);
    turnTo(target);
    showCentre(target);
  }

  let frame = 0;
  let timer = 0;
  list.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => showCentre(indexNow()));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (drag) return;
        if (settling) {
          settling = false;
          delete list.dataset.dragging;
        }
        tune(indexNow());
      }, 160);
    },
    { passive: true },
  );

  // Mouse: grab and drag. (Touch screens scroll the scale natively.)
  list.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { id: e.pointerId, startX: e.clientX, startLeft: list.scrollLeft, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false };
  });
  list.addEventListener("pointermove", (e) => {
    const d = drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      list.setPointerCapture(e.pointerId);
      list.dataset.dragging = "";
    }
    list.scrollLeft = d.startLeft - dx;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = 0.7 * ((e.clientX - d.lastX) / dt) + 0.3 * d.v;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  });
  const endDrag = (e: PointerEvent) => {
    const d = drag;
    if (!d || d.id !== e.pointerId) return;
    drag = null;
    if (!d.moved) return;
    dragEndedAt = performance.now();
    // A flick carries the scale on a little; then the nearest country comes to rest under the needle.
    const held = e.timeStamp - d.lastT > 80;
    const carry = held || reducedMotion() ? 0 : d.v * 220;
    const target = clamp(Math.round((list.scrollLeft - carry) / itemWidth()));
    if (Math.abs(target * itemWidth() - list.scrollLeft) < 1) {
      delete list.dataset.dragging;
      tune(target);
      return;
    }
    settling = true;
    turnTo(target);
  };
  list.addEventListener("pointerup", endDrag);
  list.addEventListener("pointercancel", endDrag);

  list.addEventListener(
    "click",
    (e) => {
      // The click that ends a drag is not a click on a country.
      if (performance.now() - dragEndedAt < 250) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const a = (e.target as Element).closest("a");
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // A plain click tunes in on this page instead of opening the country's own page.
      e.preventDefault();
      e.stopPropagation();
      tuneAndTurn(items.indexOf(a.closest("li") as HTMLLIElement));
    },
    true,
  );

  list.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "Home" ? -Infinity : e.key === "End" ? Infinity : 0;
    if (!step) return;
    e.preventDefault();
    const target = clamp(Number.isFinite(step) ? centre + step : step > 0 ? countries.length - 1 : 0);
    tuneAndTurn(target);
    items[target]?.querySelector("a")?.focus({ preventScroll: true });
  });

  for (const b of steps) b.addEventListener("click", () => tuneAndTurn(centre + Number(b.dataset.dialStep)));

  // "Try again" after the stations of a country failed to load.
  slot?.addEventListener("click", (e) => {
    if ((e.target as Element).closest("[data-retry-tuned]")) void showStations(countries[tuned]);
  });
}

