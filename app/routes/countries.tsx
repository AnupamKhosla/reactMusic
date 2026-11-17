import { Link } from "react-router";
import type { Route } from "./+types/countries";
import { TuningDial } from "~/components/TuningDial";
import { Breadcrumbs, Container, PageHeading } from "~/components/ui";
import { formatCount, paths } from "~/lib/names";
import { cacheFor, guard } from "~/lib/pages.server";
import { getCountries } from "~/lib/radio.server";
import { breadcrumbLd, seo, STATIC_CACHE } from "~/lib/seo";

export async function loader() {
  const countries = await guard(getCountries);
  return { countries };
}

export const headers = cacheFor(STATIC_CACHE);

export function meta({ loaderData }: Route.MetaArgs) {
  const n = loaderData?.countries.length ?? 200;
  return seo({
    title: "Radio Stations by Country – Listen Live Online",
    description: `Live radio from ${n} countries. Pick a country and listen to its stations for free, with no sign-up and no app.`,
    path: "/countries",
    jsonLd: [
      breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Countries", path: "/countries" },
      ]),
    ],
  });
}

export default function Countries({ loaderData }: Route.ComponentProps) {
  const { countries } = loaderData;
  const groups = new Map<string, typeof countries>();
  for (const c of [...countries].sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const letter = c.name[0].toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), c]);
  }
  return (
    <Container>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Countries" }]} />
      <PageHeading kicker={<><span className="num">{countries.length}</span> countries</>} title="Radio by country">
        <p>Every country with a live station on air. The most listened-to countries are on the dial; all of them are listed A to Z below.</p>
      </PageHeading>
      <div className="mt-8">
        <TuningDial countries={countries.slice(0, 40)} label="Most listened-to countries" />
      </div>
      <nav aria-label="Jump to a letter" className="mt-12 flex flex-wrap gap-1">
        {[...groups.keys()].map((letter) => (
          <a key={letter} href={`#letter-${letter}`} className="num grid h-9 w-9 place-items-center rounded border border-line hover:bg-ink hover:text-paper">
            {letter}
          </a>
        ))}
      </nav>
      <div className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3 xl:columns-4">
        {[...groups.entries()].map(([letter, list]) => (
          <section key={letter} id={`letter-${letter}`} aria-labelledby={`h-${letter}`} className="mb-8 break-inside-avoid scroll-mt-6">
            <h2 id={`h-${letter}`} className="display mb-2 border-b border-line pb-1 text-3xl">
              {letter}
            </h2>
            <ul>
              {list.map((c) => (
                <li key={c.code}>
                  <Link to={paths.country(c.slug)} prefetch="intent" className="group flex items-baseline gap-2 py-1.5">
                    <span className="num w-7 flex-none text-[0.72rem] text-muted">{c.code}</span>
                    <span className="flex-1 group-hover:underline">{c.name}</span>
                    <span className="num text-sm text-muted">{formatCount(c.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}
