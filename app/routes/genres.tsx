import type { Route } from "./+types/genres";
import { Breadcrumbs, Chips, Container, PageHeading, Section } from "~/components/ui";
import { paths } from "~/lib/names";
import { cacheFor, guard } from "~/lib/pages.server";
import { getGenres } from "~/lib/radio.server";
import { breadcrumbLd, seo, STATIC_CACHE } from "~/lib/seo";

export async function loader() {
  const genres = await guard(getGenres);
  const chips = genres.map((g) => ({ to: paths.genre(g.slug), label: g.label, count: g.count }));
  return { top: chips.slice(0, 48), rest: chips.slice(48, 400).sort((a, b) => a.label.localeCompare(b.label, "en")), total: genres.length };
}

export const headers = cacheFor(STATIC_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  const names = loaderData?.top.slice(0, 5).map((g) => g.label.toLowerCase()).join(", ") ?? "pop, rock, news, jazz";
  return seo({
    title: "Radio Stations by Genre – Listen Live Online",
    description: `Find live radio by genre: ${names} and hundreds more. Free, no sign-up, no app.`,
    path: "/genres",
    jsonLd: [
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Genres", path: "/genres" },
      ]),
    ],
  });
}

export default function Genres({ loaderData }: Route.ComponentProps) {
  const { top, rest, total } = loaderData;
  return (
    <Container>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Genres" }]} />
      <PageHeading kicker={<><span className="num">{total}</span> genres</>} title="Find your sound">
        <p>From news and talk to jazz, k-pop and lo-fi. The number on each genre is how many stations play it.</p>
      </PageHeading>
      <Section title="Most played">
        <Chips items={top} label="Most played genres" />
      </Section>
      {rest.length > 0 ? (
        <Section title="More genres, A to Z">
          <Chips items={rest} label="More genres" />
        </Section>
      ) : null}
    </Container>
  );
}
