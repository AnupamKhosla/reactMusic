import { Form, useNavigation } from "react-router";
import { ArrowRightIcon, SearchIcon, SpinnerIcon } from "./Icons";

/** Searches station names. A plain GET form, so it works before the page's script has loaded. */
export function SearchBox({ size = "md", defaultValue = "", autoFocus = false }: { size?: "md" | "lg"; defaultValue?: string; autoFocus?: boolean }) {
  const navigation = useNavigation();
  const searching = navigation.state !== "idle" && navigation.location?.pathname === "/search";
  const big = size === "lg";
  return (
    <Form method="get" action="/search" role="search" className="w-full">
      <label htmlFor={big ? "q-hero" : "q-top"} className="sr-only">
        Search stations by name
      </label>
      <div
        className={`flex items-center gap-2 rounded-full border-2 border-line bg-paper pl-4 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[var(--focus)] ${
          big ? "h-16 pl-6" : "h-11"
        }`}
      >
        <SearchIcon size={big ? 22 : 18} className="flex-none text-muted" />
        <input
          id={big ? "q-hero" : "q-top"}
          type="search"
          name="q"
          defaultValue={defaultValue}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          required
          minLength={2}
          maxLength={80}
          autoComplete="off"
          enterKeyHint="search"
          placeholder={big ? "Search a station by name" : "Search stations"}
          className={`min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted focus:outline-none ${big ? "text-lg" : "text-[0.95rem]"}`}
        />
        <button
          type="submit"
          aria-label="Search"
          className={`grid flex-none cursor-pointer place-items-center rounded-full bg-red text-on-red ${big ? "mr-2 h-12 w-12" : "mr-1 h-8 w-8"}`}
        >
          {searching ? <SpinnerIcon size={big ? 22 : 16} /> : <ArrowRightIcon size={big ? 22 : 16} />}
        </button>
      </div>
    </Form>
  );
}
