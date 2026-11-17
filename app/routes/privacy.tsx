import type { Route } from "./+types/privacy";
import { CountMeToggle } from "~/components/CountMeToggle";
import { Breadcrumbs, Container, PageHeading } from "~/components/ui";
import { seo, STATIC_CACHE } from "~/lib/seo";

export function meta(_: Route.MetaArgs) {
  return seo({
    title: "Privacy",
    description: "What LiveRadio keeps and counts: no accounts, no tracking cookies, favourites stay on your device.",
    path: "/privacy",
  });
}

export function headers() {
  return { "Cache-Control": STATIC_CACHE };
}

const SECTIONS: [string, string[]][] = [
  [
    "The short version",
    [
      "LiveRadio has no accounts, no ads and no tracking cookies. We never ask for your name or email address.",
      "Your favourites, recently played stations and volume are saved in your own browser. They are never sent to us.",
    ],
  ],
  [
    "What we count",
    [
      "To see whether people find the site useful, the site counts visits anonymously: which pages are opened, which stations are played and for how long, searches typed into the search box, the site you came from, your country (worked out from your connection, without keeping your IP address), and the kind of device and browser.",
      "To tell new visitors from returning ones, your browser keeps a random number made up on your device. It is not linked to your name, your email or anything else about you. If your browser sends a Global Privacy Control signal, that number lasts only until you close the tab.",
      "You can switch counting off for this browser below. Clearing your browser's site data removes the random number too.",
    ],
  ],
  [
    "Stations and their logos",
    [
      "When you press play, the audio comes straight from the station's own server, and station logos load from the stations' own websites. Like any website, those servers can see your IP address. Their own privacy policies apply.",
    ],
  ],
];

export default function Privacy() {
  return (
    <Container className="max-w-3xl">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Privacy" }]} />
      <PageHeading kicker="Updated 17 November 2026" title="Privacy" />
      <div className="mt-8 space-y-10">
        {SECTIONS.map(([title, paragraphs]) => (
          <section key={title}>
            <h2 className="display text-2xl">{title}</h2>
            {paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="mt-3 text-ink-2">
                {p}
              </p>
            ))}
          </section>
        ))}
        <CountMeToggle />
      </div>
    </Container>
  );
}
