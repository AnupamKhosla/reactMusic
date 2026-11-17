import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useFavorites } from "~/lib/storage";
import { CloseIcon, LogoMark, MenuIcon } from "./Icons";
import { SearchBox } from "./SearchBox";

const NAV = [
  { to: "/countries", label: "Countries" },
  { to: "/genres", label: "Genres" },
  { to: "/languages", label: "Languages" },
  { to: "/favorites", label: "Favourites" },
];

export function Header() {
  const location = useLocation();
  const favorites = useFavorites();
  const [open, setOpen] = useState(false);
  const onHome = location.pathname === "/";
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `caps rounded-full px-3 py-2 hover:bg-paper-2 ${isActive ? "bg-ink text-paper hover:bg-ink" : "text-ink"}`;

  return (
    <header className="border-b border-line">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="flex flex-none items-center gap-2.5" aria-label="LiveRadio home">
          <LogoMark size={34} />
          <span className="display text-[1.55rem] tracking-tight">LiveRadio</span>
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} prefetch="intent" className={navClass}>
              {item.label}
              {item.to === "/favorites" && favorites.length > 0 ? <span className="num ml-1.5 text-[0.7rem]">{favorites.length}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden w-full max-w-xs lg:block">{onHome ? null : <SearchBox />}</div>
        <button
          type="button"
          className="ml-auto grid h-11 w-11 cursor-pointer place-items-center rounded-full md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </div>
      {open ? (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-hair px-4 pt-3 pb-4 md:hidden">
          <div className="mb-3">
            <SearchBox />
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => `${navClass({ isActive })} block text-center`} onClick={() => setOpen(false)}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
