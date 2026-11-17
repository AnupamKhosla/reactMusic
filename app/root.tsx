import { useEffect } from "react";
import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useRouteLoaderData } from "react-router";
import frauncesLatin from "@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url";
import instrumentLatin from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";

import type { Route } from "./+types/root";
import "./app.css";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { PlayerBar } from "./components/PlayerBar";
import { SearchBox } from "./components/SearchBox";
import { Container } from "./components/ui";
import { startAnalytics, track } from "./lib/analytics.client";
import { browserMirror } from "./lib/radio.server";
import { seo } from "./lib/seo";
import { PlayerProvider } from "./player/player";

export async function loader() {
  return { mirror: await browserMirror() };
}

// The root data never changes between pages: don't ask the server for it again on every navigation.
export function shouldRevalidate() {
  return false;
}

export const links: Route.LinksFunction = () => [
  { rel: "preload", href: frauncesLatin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: instrumentLatin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/manifest.webmanifest" },
];

export function meta({ error }: Route.MetaArgs) {
  if (error) {
    const notFound = isRouteErrorResponse(error) && error.status === 404;
    return [{ title: notFound ? "Page not found | LiveRadio" : "Something went wrong | LiveRadio" }, { name: "robots", content: "noindex" }];
  }
  return seo({ title: "LiveRadio", path: "/" });
}

let lastTrackedKey = "";

/** Counts page views (History API navigations included) for the anonymous visit counter. */
function PageViews() {
  const location = useLocation();
  useEffect(() => {
    startAnalytics();
  }, []);
  useEffect(() => {
    if (location.key === lastTrackedKey) return;
    lastTrackedKey = location.key;
    if (location.pathname.startsWith("/stats")) return;
    track("pageview", { path: location.pathname + location.search });
  }, [location.key, location.pathname, location.search]);
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const root = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#f3eee3" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#15130f" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <Meta />
        <Links />
      </head>
      <body>
        <PlayerProvider mirror={root?.mirror ?? "de1.api.radio-browser.info"}>
          <Header />
          <main id="main" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>
          <Footer />
          <PlayerBar />
          <PageViews />
        </PlayerProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const unavailable = isRouteErrorResponse(error) && error.status === 503;
  let details: string | undefined;
  if (import.meta.env.DEV && error instanceof Error) details = error.stack;

  return (
    <Container className="py-16">
      <p className="caps text-red-ink">{notFound ? "Off the dial" : "Static on the line"}</p>
      <h1 className="display mt-3 text-[3rem] sm:text-[4.4rem]">
        {notFound ? "Nothing on this frequency." : unavailable ? "The station list is busy." : "Something went wrong."}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink-2">
        {notFound
          ? "This page doesn't exist, or the station has left the directory. Search for it or tune in somewhere else."
          : unavailable
            ? "We couldn't load the list of stations just now. Please try again in a minute."
            : "Please reload the page. If it keeps happening, try again a little later."}
      </p>
      <div className="mt-8 max-w-xl">
        <SearchBox />
      </div>
      <p className="mt-6">
        <Link to="/" className="caps text-red-ink hover:underline">
          Back to the home page
        </Link>
      </p>
      {details ? (
        <pre className="mt-10 overflow-x-auto rounded border border-hair p-4 text-xs">
          <code>{details}</code>
        </pre>
      ) : null}
    </Container>
  );
}
