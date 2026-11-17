import { Link } from "react-router";
import { paths } from "~/lib/names";
import { isFavorite, toggleFavorite, useFavorites } from "~/lib/storage";
import { usePlayer } from "~/player/player";
import { track } from "~/lib/analytics.client";
import { AlertIcon, CloseIcon, ExternalIcon, HeartIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, SpinnerIcon, VolumeIcon } from "./Icons";
import { StationLogo } from "./StationLogo";

const ERRORS = {
  insecure: "Your browser blocks this station's stream on secure websites.",
  offline: "This station isn't answering right now. Try another one.",
  timeout: "This station is taking too long to start. Try again or pick another one.",
} as const;

export function PlayerBar() {
  const player = usePlayer();
  const favorites = useFavorites();
  const s = player.station;
  if (!s) return null;
  const playing = player.status === "playing";
  const loading = player.status === "loading";
  const fav = isFavorite(favorites, s.id);
  const iconBtn = "grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-full text-on-bar hover:bg-white/10 disabled:cursor-default disabled:opacity-35";
  const statusText = loading ? "Tuning in…" : playing ? "Live" : player.status === "error" ? "Not playing" : "Paused";

  return (
    <section
      aria-label="Player"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/40 bg-bar text-on-bar shadow-[0_-8px_24px_rgba(0,0,0,0.18)]"
    >
      {player.status === "error" && player.error ? (
        <div role="alert" className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-sm sm:px-6">
          <AlertIcon size={16} className="flex-none text-[#ff8a70]" />
          <span>{ERRORS[player.error]}</span>
          {player.error === "insecure" ? (
            <a href={s.stream} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 inline-flex items-center gap-1 underline">
              Open the stream in a new tab <ExternalIcon size={14} />
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="mx-auto flex h-[4.5rem] max-w-[1400px] items-center gap-3 px-3 sm:px-6">
        <StationLogo name={s.name} src={s.favicon} size={44} eager />
        <div className="min-w-0 flex-1">
          <Link to={paths.station(s)} className="block truncate font-semibold hover:underline">
            {s.name}
          </Link>
          <p className="flex items-center gap-2 text-sm text-on-bar-muted" aria-live="polite">
            <span
              className={`caps rounded-full px-2 py-0.5 text-[0.65rem] ${playing ? "bg-red text-on-red" : "border border-white/30 text-on-bar"}`}
            >
              {statusText}
            </span>
            <span className="truncate">{[s.country, s.tags[0]].filter(Boolean).join(" · ")}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={`${iconBtn} hidden sm:grid`} onClick={player.previous} disabled={!player.hasQueue} aria-label="Previous station">
            <PrevIcon size={18} />
          </button>
          <button
            type="button"
            onClick={player.toggle}
            aria-label={playing || loading ? `Pause ${s.name}` : `Play ${s.name}`}
            className="grid h-12 w-12 flex-none cursor-pointer place-items-center rounded-full bg-on-bar text-bar transition-transform hover:scale-105 motion-reduce:transition-none"
          >
            {loading ? <SpinnerIcon size={20} /> : playing ? <PauseIcon size={20} /> : <PlayIcon size={20} className="translate-x-[1px]" />}
          </button>
          <button type="button" className={`${iconBtn} hidden sm:grid`} onClick={player.next} disabled={!player.hasQueue} aria-label="Next station">
            <NextIcon size={18} />
          </button>
        </div>
        <button
          type="button"
          className={`${iconBtn} ${fav ? "text-[#ff8a70]" : ""}`}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${s.name} from favourites` : `Add ${s.name} to favourites`}
          onClick={() => {
            if (toggleFavorite(s)) track("favorite", { station: s.id, station_name: s.name });
          }}
        >
          <HeartIcon filled={fav} size={20} />
        </button>
        <div className="hidden items-center gap-1 md:flex">
          <button type="button" className={iconBtn} onClick={player.toggleMute} aria-label={player.muted ? "Unmute" : "Mute"} aria-pressed={player.muted}>
            <VolumeIcon muted={player.muted || player.volume === 0} size={20} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={player.muted ? 0 : player.volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="volume w-24"
            style={{ ["--level" as string]: `${Math.round((player.muted ? 0 : player.volume) * 100)}%` }}
          />
        </div>
        <button type="button" className={iconBtn} onClick={player.stop} aria-label="Stop and close the player">
          <CloseIcon size={18} />
        </button>
      </div>
    </section>
  );
}
