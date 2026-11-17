import { Link } from "react-router";
import { LogoMark } from "./Icons";

const LINKS = [
  { to: "/countries", label: "All countries" },
  { to: "/genres", label: "All genres" },
  { to: "/languages", label: "All languages" },
  { to: "/favorites", label: "Your favourites" },
  { to: "/about", label: "About" },
  { to: "/privacy", label: "Privacy" },
];

const POPULAR = [
  { to: "/country/united-states", label: "US radio" },
  { to: "/country/united-kingdom", label: "UK radio" },
  { to: "/country/india", label: "Indian radio" },
  { to: "/country/germany", label: "German radio" },
  { to: "/genre/jazz", label: "Jazz radio" },
  { to: "/genre/news", label: "News radio" },
  { to: "/genre/classical", label: "Classical radio" },
  { to: "/genre/pop", label: "Pop radio" },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="display text-2xl">LiveRadio</span>
          </div>
          <p className="mt-3 max-w-sm text-ink-2">
            Live radio from every country, free in your browser. No sign-up and no app. Your favourites stay on your own device.
          </p>
        </div>
        <nav aria-label="Site">
          <h2 className="caps mb-3 text-muted">Explore</h2>
          <ul className="space-y-2">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Popular">
          <h2 className="caps mb-3 text-muted">Popular</h2>
          <ul className="space-y-2">
            {POPULAR.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-hair">
        <p className="caps mx-auto max-w-[1400px] px-4 py-4 text-muted sm:px-6">Stations stream from their own servers. LiveRadio does not host or record audio.</p>
      </div>
    </footer>
  );
}
