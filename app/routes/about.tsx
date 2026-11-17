import { Link } from "react-router";
import type { Route } from "./+types/about";
import { Breadcrumbs, Container, PageHeading } from "~/components/ui";
import { seo, STATIC_CACHE } from "~/lib/seo";

export function meta(_: Route.MetaArgs) {
  return seo({
    title: "About LiveRadio",
    description: "LiveRadio is a free way to listen to live radio from every country in your browser, with no sign-up and no app.",
    path: "/about",
  });
}

export function headers() {
  return { "Cache-Control": STATIC_CACHE };
}

export default function About() {
  return (
    <Container className="max-w-3xl">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "About" }]} />
      <PageHeading kicker="About" title="Radio without borders." />
      <div className="mt-8 space-y-5 text-lg text-ink-2">
        <p>
          LiveRadio puts tens of thousands of live stations from around the world one tap away: national broadcasters, city and community stations,
          college radio and internet-only channels. It is free, it works in any modern browser, and there is nothing to install.
        </p>
        <p>
          Stations come from a free, community-kept directory of radio streams, and the lists are ordered by how many people are listening today, so
          the stations people actually enjoy come first. Stations that stop answering are left out until they are back on air.
        </p>
        <p>
          The music and talk come straight from each broadcaster. LiveRadio does not host, record or change any audio, and every station belongs to its
          owner.
        </p>
        <h2 className="display pt-4 text-2xl text-ink">Tips</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Tap the heart on a station to keep it in your favourites. They stay on this device.</li>
          <li>The player keeps playing while you browse other pages, and works with your headphones' and lock screen's play buttons.</li>
          <li>Each station page shows the stream address, so you can also listen in your own music player.</li>
        </ul>
        <p className="pt-4">
          <Link to="/privacy" className="underline">
            How LiveRadio handles privacy
          </Link>
        </p>
      </div>
    </Container>
  );
}
