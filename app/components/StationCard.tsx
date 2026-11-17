import { Link } from "react-router";
import { track } from "~/lib/analytics.client";
import { formatCount, paths } from "~/lib/names";
import { isFavorite, toggleFavorite, useFavorites } from "~/lib/storage";
import type { SavedStation, Station } from "~/lib/types";
import { usePlayer } from "~/player/player";
import { HeartIcon, PauseIcon, PlayIcon, SpinnerIcon } from "./Icons";
import { GRID } from "./Skeleton";
import { StationLogo } from "./StationLogo";

type AnyStation = Station | SavedStation;

/** The round red play button used on cards and station pages. */
export function PlayButton({
  station,
  queue,
  size = "md",
}: {
  station: AnyStation;
  queue?: AnyStation[];
  size?: "md" | "lg";
}) {
  const player = usePlayer();
  const current = player.station?.id === station.id;
  const busy = current && player.status === "loading";
  const playing = current && player.status === "playing";
  const dim = size === "lg" ? "h-16 w-16" : "h-11 w-11";
  const icon = size === "lg" ? 26 : 18;
  const label = playing ? `Pause ${station.name}` : busy ? `Stop loading ${station.name}` : `Play ${station.name}`;
  return (
    <button
      type="button"
      onClick={() => (current && (playing || busy) ? player.toggle() : player.play(station, queue))}
      aria-label={label}
      aria-pressed={playing}
      className={`${dim} grid flex-none cursor-pointer place-items-center rounded-full bg-red text-on-red transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none`}
    >
      {busy ? <SpinnerIcon size={icon} /> : playing ? <PauseIcon size={icon} /> : <PlayIcon size={icon} className="translate-x-[1px]" />}
    </button>
  );
}

export function FavoriteButton({ station, className = "" }: { station: AnyStation; className?: string }) {
  const favorites = useFavorites();
  const on = isFavorite(favorites, station.id);
  return (
    <button
      type="button"
      onClick={() => {
        const added = toggleFavorite(station);
        if (added) track("favorite", { station: station.id, station_name: station.name });
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${station.name} from favourites` : `Add ${station.name} to favourites`}
      className={`grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-full ${on ? "text-red-ink" : "text-muted hover:text-ink"} ${className}`}
    >
      <HeartIcon filled={on} size={20} />
    </button>
  );
}

// The whole card opens the station's own page (in place, through the History API; Cmd/Ctrl-click or the
// middle button opens it in a new tab). The play and heart buttons sit above that link.
export function StationCard({ station, queue, eager }: { station: AnyStation; queue?: AnyStation[]; eager?: boolean }) {
  const player = usePlayer();
  const current = player.station?.id === station.id;
  const playing = current && player.status === "playing";
  const listens = "clicks" in station && station.clicks > 0 ? station.clicks : 0;
  const meta = [station.countrycode, station.tags[0]].filter(Boolean).join(" · ");
  return (
    <li
      className={`group/card relative flex min-w-0 flex-col gap-3 rounded-lg border bg-paper p-3 transition-colors hover:bg-paper-2 ${
        current ? "border-red shadow-[inset_0_0_0_1px_var(--red)]" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <StationLogo name={station.name} src={station.favicon} size={56} eager={eager} />
        <div className="relative z-10">
          <PlayButton station={station} queue={queue} />
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[0.95rem] leading-snug font-semibold">
          <Link
            to={paths.station(station)}
            className="group-hover/card:underline after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline-[3px] focus-visible:after:outline-offset-2 focus-visible:after:outline-[var(--focus)] focus-visible:after:outline-solid"
          >
            {station.name}
          </Link>
        </h3>
        <p className="caps mt-1 truncate text-muted">{meta || " "}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="caps text-muted">
          {playing ? (
            <span className="inline-flex items-center gap-1.5 text-red-ink">
              <span className="eq" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              On air
            </span>
          ) : listens ? (
            <>
              <span className="num">{formatCount(listens)}</span> today
            </>
          ) : (
            " "
          )}
        </span>
        <FavoriteButton station={station} className="relative z-10 -mr-2 -mb-2" />
      </div>
    </li>
  );
}

export function StationGrid({ stations, label, eagerCount = 6 }: { stations: AnyStation[]; label?: string; eagerCount?: number }) {
  if (stations.length === 0) return null;
  return (
    <ul aria-label={label} className={GRID}>
      {stations.map((s, i) => (
        <StationCard key={s.id} station={s} queue={stations} eager={i < eagerCount} />
      ))}
    </ul>
  );
}
