import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/favorites";
import { StationGrid } from "~/components/StationCard";
import { Container, Notice, PageHeading, Section } from "~/components/ui";
import { favoritesStore, recentStore, useFavorites } from "~/lib/storage";
import { seo } from "~/lib/seo";

export function meta(_: Route.MetaArgs) {
  return seo({ title: "Your favourite stations", path: "/favorites", noindex: true });
}

export function headers() {
  return { "Cache-Control": "public, max-age=60, s-maxage=86400" };
}

export default function Favorites() {
  const favorites = useFavorites();
  const recent = recentStore.useValue();
  const [confirming, setConfirming] = useState(false);
  return (
    <Container>
      <PageHeading kicker="Saved on this device" title="Your stations">
        <p>Favourites and recently played stations are kept in this browser only. Nobody else can see them, and there is no account to make.</p>
      </PageHeading>
      <Section
        title="Favourites"
        action={
          favorites.length > 1 ? (
            <button
              type="button"
              className={`caps cursor-pointer hover:underline ${confirming ? "text-red-ink" : "text-muted hover:text-ink"}`}
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                favoritesStore.write([]);
                setConfirming(false);
              }}
              onBlur={() => setConfirming(false)}
            >
              {confirming ? "Tap again to remove all" : "Clear all"}
            </button>
          ) : undefined
        }
      >
        {favorites.length ? (
          <StationGrid stations={favorites} label="Favourite stations" eagerCount={0} />
        ) : (
          <Notice title="No favourites yet">
            Tap the heart on any station to keep it here. <Link to="/top" className="underline">Start with the top stations</Link>.
          </Notice>
        )}
      </Section>
      {recent.length ? (
        <Section title="Recently played">
          <StationGrid stations={recent} label="Recently played" eagerCount={0} />
        </Section>
      ) : null}
    </Container>
  );
}
