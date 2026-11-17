// Pulsing placeholders in the shape of what is loading, like v1's loading cards. Still when the visitor
// prefers less motion (app.css). Screen readers hear one "Loading" status instead of the shapes.
import { Container } from "./ui";

export const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

function Bar({ className }: { className: string }) {
  return <span className={`skeleton block ${className.includes("rounded") ? "" : "rounded"} ${className}`} />;
}

function SkeletonCard() {
  return (
    <li className="flex min-h-[11.5rem] flex-col gap-3 rounded-lg border border-hair p-3">
      <div className="flex items-start justify-between gap-2">
        <Bar className="h-14 w-14 rounded-md" />
        <Bar className="h-11 w-11 rounded-full" />
      </div>
      <Bar className="h-4 w-4/5" />
      <Bar className="h-3 w-2/5" />
      <Bar className="mt-auto h-3 w-1/3" />
    </li>
  );
}

export function SkeletonGrid({ count = 12, label = "Loading stations" }: { count?: number; label?: string }) {
  return (
    <div role="status">
      <span className="sr-only">{label}…</span>
      <ul aria-hidden="true" className={GRID}>
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ul>
    </div>
  );
}

/** Shown in place of the page while the next page loads. */
export function PageSkeleton() {
  return (
    <Container>
      <div role="status" className="pt-6">
        <span className="sr-only">Loading the page…</span>
        <div aria-hidden="true">
          <Bar className="h-3 w-44" />
          <Bar className="mt-9 h-3 w-36" />
          <Bar className="mt-4 h-11 w-3/4 max-w-xl sm:h-14" />
          <Bar className="mt-6 h-4 w-full max-w-2xl" />
          <Bar className="mt-2.5 h-4 w-2/3 max-w-xl" />
          <div className="mt-8 mb-5 flex gap-2">
            <Bar className="h-9 w-28 rounded-full" />
            <Bar className="h-9 w-24 rounded-full" />
            <Bar className="h-9 w-28 rounded-full" />
          </div>
          <ul className={GRID}>
            {Array.from({ length: 12 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </ul>
        </div>
      </div>
    </Container>
  );
}
