import type { ReactNode } from "react";
import type { SortKey } from "~/lib/lists";
import { useListLoading } from "~/lib/pending";
import type { CardStation } from "~/lib/types";
import { SkeletonGrid } from "./Skeleton";
import { StationGrid } from "./StationCard";
import { Breadcrumbs, Chips, Container, Notice, PageHeading, Pagination, Section, SortTabs, type ChipItem } from "./ui";

export type Related = { title: string; items: ChipItem[] };

export function StationListPage({
  crumbs,
  kicker,
  title,
  intro,
  base,
  sort,
  page,
  hasNext,
  stations,
  related = [],
  empty,
}: {
  crumbs: { name: string; path?: string }[];
  kicker?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  base: string;
  sort: SortKey;
  page: number;
  hasNext: boolean;
  stations: CardStation[];
  related?: Related[];
  empty?: ReactNode;
}) {
  const listLoading = useListLoading();
  return (
    <Container>
      <Breadcrumbs items={crumbs} />
      <PageHeading kicker={kicker} title={title}>
        {intro}
      </PageHeading>
      <div className="mt-8 mb-5">
        <SortTabs base={base} current={sort} />
      </div>
      {listLoading ? (
        <SkeletonGrid count={Math.min(stations.length || 12, 24)} />
      ) : stations.length > 0 ? (
        <StationGrid stations={stations} label="Stations" />
      ) : (
        <Notice title="No stations here right now">{empty ?? "Every station on this list is off air at the moment. Try another one."}</Notice>
      )}
      <Pagination base={base} sort={sort} page={page} hasNext={hasNext} />
      {related
        .filter((r) => r.items.length > 0)
        .map((r) => (
          <Section key={r.title} title={r.title}>
            <Chips items={r.items} label={r.title} />
          </Section>
        ))}
    </Container>
  );
}
