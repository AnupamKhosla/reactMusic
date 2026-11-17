// Countries on an old radio's frequency scale, lit like a radio's dial window. The red needle stays in the
// middle. Grab and drag the scale with the mouse, swipe it, scroll it, or use the arrow buttons or arrow keys:
// the country that comes to rest under the needle is "tuned", and the page shows its stations without leaving.
// Each country is still a real link to its own page (search engines follow it; Cmd/Ctrl-click opens a new tab).
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { formatCount, paths } from "~/lib/names";
import type { Country } from "~/lib/types";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

const ITEM_REM = 9;
const LIST_ID = "dial-list";
const useBrowserLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

type Drag = { id: number; startX: number; startLeft: number; lastX: number; lastT: number; v: number; moved: boolean };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TuningDial({
  countries,
  tuned,
  onTune,
  label = "Tune in by country",
}: {
  countries: Country[];
  /** Slug of the tuned country. */
  tuned: string;
  onTune: (country: Country) => void;
  label?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const tunedIndex = Math.max(0, countries.findIndex((c) => c.slug === tuned));
  // The country under the needle right now; follows the scale while it moves.
  const [centre, setCentre] = useState(tunedIndex);
  const drag = useRef<Drag | null>(null);
  const settling = useRef(false);
  const dragEndedAt = useRef(0);
  const lastTuned = useRef(tuned);
  const onTuneRef = useRef(onTune);
  onTuneRef.current = onTune;

  const itemWidth = () => (listRef.current?.firstElementChild as HTMLElement | null)?.offsetWidth || 144;
  const clampIndex = (i: number) => Math.min(countries.length - 1, Math.max(0, i));
  const indexNow = () => clampIndex(Math.round((listRef.current?.scrollLeft ?? 0) / itemWidth()));

  const tune = (i: number) => {
    const country = countries[i];
    if (!country || country.slug === lastTuned.current) return;
    lastTuned.current = country.slug;
    onTuneRef.current(country);
  };

  const turnTo = (i: number) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ left: clampIndex(i) * itemWidth(), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  const tuneAndTurn = (i: number) => {
    const target = clampIndex(i);
    tune(target);
    turnTo(target);
  };

  // The tuned country sits under the needle from the first paint (the inline script below does it during
  // page load; this covers pages rendered in the browser).
  useBrowserLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollLeft = tunedIndex * itemWidth();
    setCentre(tunedIndex);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The page tuned another country (the back button, for example): turn the dial to it.
  useEffect(() => {
    lastTuned.current = tuned;
    if (!drag.current && !settling.current && indexNow() !== tunedIndex) turnTo(tunedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuned]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let frame = 0;
    let timer = 0;
    const comeToRest = () => {
      if (drag.current) return;
      if (settling.current) {
        settling.current = false;
        delete el.dataset.dragging;
      }
      tune(indexNow());
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCentre(indexNow()));
      window.clearTimeout(timer);
      timer = window.setTimeout(comeToRest, 160);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  // Mouse: grab and drag. (Touch screens scroll the scale natively.)
  const onPointerDown = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = e.currentTarget;
    drag.current = { id: e.pointerId, startX: e.clientX, startLeft: el.scrollLeft, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const el = e.currentTarget;
    const dx = e.clientX - d.startX;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return;
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = "";
    }
    el.scrollLeft = d.startLeft - dx;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = 0.7 * ((e.clientX - d.lastX) / dt) + 0.3 * d.v;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
  };
  const onPointerUp = (e: PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    dragEndedAt.current = performance.now();
    const el = e.currentTarget;
    // A flick carries the scale on a little; then the nearest country comes to rest under the needle.
    const held = e.timeStamp - d.lastT > 80;
    const carry = held || reducedMotion() ? 0 : d.v * 220;
    const target = clampIndex(Math.round((el.scrollLeft - carry) / itemWidth()));
    if (Math.abs(target * itemWidth() - el.scrollLeft) < 1) {
      delete el.dataset.dragging;
      tune(target);
      return;
    }
    settling.current = true;
    turnTo(target);
  };
  // The click that ends a drag is not a click on a country.
  const onClickCapture = (e: MouseEvent<HTMLUListElement>) => {
    if (performance.now() - dragEndedAt.current < 250) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "Home" ? -Infinity : e.key === "End" ? Infinity : 0;
    if (!step) return;
    e.preventDefault();
    const target = clampIndex(Number.isFinite(step) ? centre + step : step > 0 ? countries.length - 1 : 0);
    tuneAndTurn(target);
    setCentre(target);
    (listRef.current?.children[target]?.querySelector("a") as HTMLAnchorElement | null)?.focus({ preventScroll: true });
  };

  return (
    <section aria-label={label} className="relative">
      <div className="relative overflow-hidden rounded-xl border-2 border-line bg-bar text-on-bar">
        {/* The needle, behind the printed labels. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2">
          <div className="mx-auto h-0 w-0 border-x-[9px] border-t-[12px] border-x-transparent border-t-red" />
          <div className="mx-auto h-full w-[3px] bg-red" />
        </div>
        <ul
          id={LIST_ID}
          ref={listRef}
          aria-label="Countries"
          className="dial-scale no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto select-none pointer-fine:cursor-grab data-dragging:cursor-grabbing data-dragging:snap-none"
          style={{ paddingInline: `calc(50% - ${ITEM_REM / 2}rem)` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          onKeyDown={onKeyDown}
        >
          {countries.map((c, i) => {
            const active = i === centre;
            return (
              <li key={c.code} className="flex-none snap-center" style={{ width: `${ITEM_REM}rem` }}>
                <a
                  href={paths.country(c.slug)}
                  draggable={false}
                  tabIndex={active ? 0 : -1}
                  aria-current={c.slug === tuned ? "true" : undefined}
                  onClick={(e) => {
                    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    tuneAndTurn(i);
                  }}
                  className="group block pt-[34px] pb-4 text-center outline-offset-[-4px] pointer-fine:cursor-[inherit]"
                >
                  <span className="block bg-bar px-2 py-1">
                    <span aria-hidden="true" className={`num block text-[0.8rem] ${active ? "text-on-bar" : "text-on-bar-muted"}`}>
                      {(87.5 + i * 0.5).toFixed(1)}
                    </span>
                    <span
                      className={`num mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[0.8rem] font-medium tracking-wider ${
                        active ? "border-on-bar bg-on-bar text-bar" : "border-on-bar-muted text-on-bar"
                      }`}
                    >
                      {c.code}
                    </span>
                    <span className={`mt-1.5 block truncate font-semibold group-hover:underline ${active ? "text-on-bar" : "text-on-bar-muted"}`}>
                      {c.name}
                    </span>
                    <span className="caps block text-on-bar-muted">
                      <span className="num">{formatCount(c.count)}</span> stations
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        {/* Runs while the page loads, before it is painted: the tuned country starts under the needle. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var u=document.getElementById("${LIST_ID}"),f=u&&u.firstElementChild;if(f)u.scrollLeft=${tunedIndex}*f.offsetWidth})()`,
          }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="caps text-ink-2">Drag or swipe the dial · pick a country</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => tuneAndTurn(centre - 1)}
            disabled={centre === 0}
            aria-label="Tune to the previous country"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 border-line hover:bg-paper-2 disabled:cursor-default disabled:opacity-35"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => tuneAndTurn(centre + 1)}
            disabled={centre === countries.length - 1}
            aria-label="Tune to the next country"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 border-line hover:bg-paper-2 disabled:cursor-default disabled:opacity-35"
          >
            <ArrowRightIcon size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
