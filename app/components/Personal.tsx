// Parts of the home page that differ per visitor. They render only in the browser, so the cached page
// that search engines and every visitor get stays the same.
import { useEffect, useState } from "react";
import { paths } from "~/lib/names";
import { recentStore } from "~/lib/storage";
import type { CardStation } from "~/lib/types";
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

type Near = { country: { code: string; name: string; slug: string } | null; stations: CardStation[] };

export function NearYou() {
  const [near, setNear] = useState<Near | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/near", { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Near>) : null))
      .then((body) => {
        if (body?.country && body.stations.length > 0) setNear(body);
      })
      .catch(() => {
        /* the section is a bonus; leave it out */
      });
    return () => controller.abort();
  }, []);
  if (!near?.country) return null;
  return (
    <Section id="near" title={`Popular in ${near.country.name}`} action={<MoreLink to={paths.country(near.country.slug)}>All stations</MoreLink>}>
      <StationGrid stations={near.stations} label={`Popular in ${near.country.name}`} eagerCount={0} />
    </Section>
  );
}
