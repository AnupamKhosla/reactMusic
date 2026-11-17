// Countries laid out along an old radio's frequency scale. The red needle stays in the middle; scrolling the
// scale "tunes" to the country under it. Every country is a plain link (crawlable, keyboard reachable).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { formatCount, paths } from "~/lib/names";
import type { Country } from "~/lib/types";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

const ITEM_REM = 9;

export function TuningDial({ countries, label = "Tune in by country" }: { countries: Country[]; label?: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [tuned, setTuned] = useState(0);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDistance = Infinity;
        Array.from(el.children).forEach((child, i) => {
          const item = child as HTMLElement;
          const d = Math.abs(item.offsetLeft + item.offsetWidth / 2 - mid);
          if (d < bestDistance) {
            bestDistance = d;
            best = i;
          }
        });
        setTuned(best);
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const nudge = (dir: 1 | -1) => {
    const el = listRef.current;
    if (!el) return;
    const item = el.children[0] as HTMLElement | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * (item?.offsetWidth ?? 144) * 2, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-label={label} className="relative">
      <div className="relative overflow-hidden rounded-xl border-2 border-line bg-paper-2">
        {/* The needle, behind the printed labels. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2">
          <div className="mx-auto h-0 w-0 border-x-[9px] border-t-[12px] border-x-transparent border-t-red" />
          <div className="mx-auto h-full w-[3px] bg-red" />
        </div>
        <ul
          ref={listRef}
          className="dial-scale no-scrollbar relative flex snap-x snap-mandatory overflow-x-auto"
          style={{ paddingInline: `calc(50% - ${ITEM_REM / 2}rem)` }}
        >
          {countries.map((c, i) => {
            const active = i === tuned;
            return (
              <li key={c.code} className="flex-none snap-center" style={{ width: `${ITEM_REM}rem` }}>
                <Link
                  to={paths.country(c.slug)}
                  prefetch="intent"
                  aria-current={active ? "true" : undefined}
                  className="group block pt-[34px] pb-4 text-center outline-offset-[-4px]"
                >
                  <span className="block bg-paper-2 px-2 pt-1 pb-1">
                    <span aria-hidden="true" className={`num block text-[0.7rem] ${active ? "text-red-ink" : "text-muted"}`}>
                      {(87.5 + i * 0.5).toFixed(1)}
                    </span>
                    <span
                      className={`mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[0.7rem] font-medium tracking-wider num ${
                        active ? "border-red bg-red text-on-red" : "border-line text-ink"
                      }`}
                    >
                      {c.code}
                    </span>
                    <span className={`mt-1.5 block truncate font-semibold group-hover:underline ${active ? "text-ink" : "text-ink-2"}`}>{c.name}</span>
                    <span className="caps block text-muted">
                      <span className="num">{formatCount(c.count)}</span> stations
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="caps text-muted">Scroll the dial or use the arrows</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Tune left"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 border-line hover:bg-paper-2"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Tune right"
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border-2 border-line hover:bg-paper-2"
          >
            <ArrowRightIcon size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
