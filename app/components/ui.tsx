// Small building blocks shared by the pages.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { listHref, SORTS, type SortKey } from "~/lib/lists";
import { formatCount } from "~/lib/names";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1400px] px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Section({ title, action, children, id }: { title: string; action?: ReactNode; children: ReactNode; id?: string }) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section aria-labelledby={headingId} className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3">
        <h2 id={headingId} className="display text-[1.75rem] sm:text-[2.1rem]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} prefetch="intent" className="caps inline-flex flex-none items-center gap-1.5 text-red-ink hover:underline">
      {children} <ArrowRightIcon size={14} />
    </Link>
  );
}

export type ChipItem = { to: string; label: string; count?: number };

export function Chips({ items, label }: { items: ChipItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            prefetch="intent"
            className="caps inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-ink hover:bg-ink hover:text-paper"
          >
            {item.label}
            {item.count ? <span className="num text-[0.68rem] opacity-80">{formatCount(item.count)}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; path?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-6">
      <ol className="caps flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden="true">/</span> : null}
            {item.path && i < items.length - 1 ? (
              <Link to={item.path} className="hover:text-ink hover:underline">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeading({ kicker, title, children }: { kicker?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="pt-6 pb-2">
      {kicker ? <p className="caps mb-3 text-red-ink">{kicker}</p> : null}
      <h1 className="display text-[2.6rem] sm:text-[3.6rem] lg:text-[4.4rem]">{title}</h1>
      {children ? <div className="mt-4 max-w-2xl text-lg text-ink-2">{children}</div> : null}
    </div>
  );
}

export function SortTabs({ base, current }: { base: string; current: SortKey }) {
  return (
    <nav aria-label="Sort stations" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {SORTS.map((s) => {
        const active = s.key === current;
        return (
          <Link
            key={s.key}
            to={listHref(base, s.key, 1)}
            preventScrollReset
            aria-current={active ? "page" : undefined}
            className={`caps flex-none rounded-full border px-3.5 py-2 ${active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:bg-paper-2"}`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({ base, sort, page, hasNext }: { base: string; sort: SortKey; page: number; hasNext: boolean }) {
  if (page === 1 && !hasNext) return null;
  const btn = "caps inline-flex h-11 items-center gap-2 rounded-full border-2 border-line px-5 hover:bg-paper-2";
  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link to={listHref(base, sort, page - 1)} className={btn} rel="prev">
          <ArrowLeftIcon size={16} /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="caps text-muted">
        Page <span className="num">{page}</span>
      </span>
      {hasNext ? (
        <Link to={listHref(base, sort, page + 1)} className={btn} rel="next">
          Next <ArrowRightIcon size={16} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="status" className="rounded-xl border-2 border-dashed border-line p-8 text-center">
      <p className="display text-2xl">{title}</p>
      {children ? <div className="mx-auto mt-2 max-w-md text-ink-2">{children}</div> : null}
    </div>
  );
}
