import type { Route } from "./+types/languages";
import { Breadcrumbs, Chips, Container, PageHeading, Section } from "~/components/ui";
import { paths } from "~/lib/names";
import { cacheFor, guard } from "~/lib/pages.server";
import { getLanguages } from "~/lib/radio.server";
import { breadcrumbLd, seo, STATIC_CACHE } from "~/lib/seo";

export async function loader() {
  const languages = await guard(getLanguages);
  const chips = languages.map((l) => ({ to: paths.language(l.slug), label: l.label, count: l.count }));
  return { top: chips.slice(0, 40), rest: chips.slice(40).sort((a, b) => a.label.localeCompare(b.label, "en")), total: languages.length };
}

export const headers = cacheFor(STATIC_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  return seo({
    title: "Radio Stations by Language – Listen Live Online",
    description: `Live radio in ${loaderData?.total ?? "hundreds of"} languages, from English, Spanish and Hindi to Welsh and Yoruba. Free, no sign-up, no app.`,
    path: "/languages",
    jsonLd: [
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Languages", path: "/languages" },
      ]),
    ],
  });
}

export default function Languages({ loaderData }: Route.ComponentProps) {
  const { top, rest, total } = loaderData;
  return (
    <Container>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Languages" }]} />
      <PageHeading kicker={<><span className="num">{total}</span> languages</>} title="Radio by language">
        <p>Hear the world in its own words. The number on each language is how many stations broadcast in it.</p>
      </PageHeading>
      <Section title="Most spoken on air">
        <Chips items={top} label="Most common languages" />
      </Section>
      {rest.length > 0 ? (
        <Section title="More languages, A to Z">
          <Chips items={rest} label="More languages" />
        </Section>
      ) : null}
    </Container>
  );
}
