// Parts of a page that differ per visitor. They render only in the browser, so the cached page that search
// engines and every visitor get stays the same.
import { recentStore } from "~/lib/storage";
import { StationGrid } from "./StationCard";
import { MoreLink, Section } from "./ui";

export function RecentlyPlayed() {
  const recent = recentStore.useValue();
  if (recent.length === 0) return null;
  return (
    <Section id="recent" title="Recently played" action={<MoreLink to="/favorites">Favourites</MoreLink>}>
      <StationGrid stations={recent.slice(0, 6)} label="Recently played" eagerCount={0} />
    </Section>
  );
}
