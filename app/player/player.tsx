// The one audio player of the site. It lives in the root layout, so it keeps playing while the visitor moves
// between pages (React Router changes pages with the History API, never a full reload).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushNow, track } from "~/lib/analytics.client";
import { pushRecent, toSaved, volumeStore } from "~/lib/storage";
import type { SavedStation, Station } from "~/lib/types";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
/** insecure: the stream only exists over plain http, which browsers block on a secure page. */
export type PlayerError = "insecure" | "offline" | "timeout";

type PlayerContextValue = {
  station: SavedStation | null;
  status: PlayerStatus;
  error: PlayerError | null;
  volume: number;
  muted: boolean;
  hasQueue: boolean;
  play: (station: Station | SavedStation, queue?: (Station | SavedStation)[]) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer outside PlayerProvider");
  return value;
}

const LOAD_TIMEOUT_MS = 20_000;
const LISTEN_REPORT_SECS = 30;

type HlsLike = { destroy(): void; loadSource(url: string): void; attachMedia(el: HTMLMediaElement): void; on(ev: string, cb: (...a: unknown[]) => void): void };

export function PlayerProvider({ children, mirror }: { children: ReactNode; mirror: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<HlsLike | null>(null);
  const attemptRef = useRef(0);
  const upgradedRef = useRef(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenFromRef = useRef<number | null>(null);
  const countedRef = useRef<string | null>(null);
  const stationRef = useRef<SavedStation | null>(null);

  const [station, setStation] = useState<SavedStation | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [error, setError] = useState<PlayerError | null>(null);
  const [queue, setQueue] = useState<SavedStation[]>([]);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);

  stationRef.current = station;

  /** Reports listening time not yet reported. */
  const reportListening = useCallback((final: boolean) => {
    const from = listenFromRef.current;
    const s = stationRef.current;
    if (from == null || !s) return;
    const secs = Math.floor((Date.now() - from) / 1000);
    if (secs >= LISTEN_REPORT_SECS || (final && secs >= 1)) {
      track("listen", { station: s.id, station_name: s.name, value: secs });
      listenFromRef.current = final ? null : Date.now();
    }
    if (final) {
      listenFromRef.current = null;
      flushNow();
    }
  }, []);

  const clearLoadTimer = () => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = null;
  };

  const fail = useCallback(
    (kind: PlayerError) => {
      clearLoadTimer();
      reportListening(true);
      setStatus("error");
      setError(kind);
      const s = stationRef.current;
      track("play_error", { station: s?.id, station_name: s?.name, label: kind });
    },
    [reportListening],
  );

  // Create the audio element once, in the browser.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;
    const v = volumeStore.read();
    audio.volume = v;
    setVolumeState(v);

    const onPlaying = () => {
      clearLoadTimer();
      setStatus("playing");
      setError(null);
      const s = stationRef.current;
      if (listenFromRef.current == null) listenFromRef.current = Date.now();
      if (s && countedRef.current !== `${s.id}:${attemptRef.current}`) {
        countedRef.current = `${s.id}:${attemptRef.current}`;
        track("playing", { station: s.id, station_name: s.name });
        // Tell the community directory this station was listened to (it ranks stations by these clicks).
        fetch(`https://${mirror}/json/url/${s.id}`, { mode: "cors" }).catch(() => {});
      }
    };
    const onPause = () => {
      if (audio.ended || audio.error) return;
      reportListening(true);
      setStatus((prev) => (prev === "error" || prev === "idle" ? prev : "paused"));
    };
    const onWaiting = () => setStatus((prev) => (prev === "playing" ? "loading" : prev));
    const onError = () => {
      if (!audio.getAttribute("src") && !hlsRef.current) return;
      fail(upgradedRef.current ? "insecure" : "offline");
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);
    const timer = setInterval(() => {
      if (!audio.paused) reportListening(false);
    }, 10_000);
    const onHide = () => {
      if (document.visibilityState === "hidden" && !audio.paused) {
        // Keep counting in the background, but make sure what was heard so far is saved.
        reportListening(false);
        flushNow();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
  }, [mirror, fail, reportListening]);

  const teardown = () => {
    const audio = audioRef.current;
    clearLoadTimer();
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  };

  const start = useCallback(
    async (s: SavedStation) => {
      const audio = audioRef.current;
      if (!audio) return;
      const attempt = ++attemptRef.current;
      reportListening(true);
      teardown();
      setStation(s);
      setStatus("loading");
      setError(null);
      pushRecent(s);
      track("play", { station: s.id, station_name: s.name });

      let url = s.stream;
      upgradedRef.current = false;
      if (window.location.protocol === "https:" && /^http:\/\//i.test(url)) {
        // Browsers refuse plain-http audio on a secure page; many stations answer on https as well.
        url = url.replace(/^http:\/\//i, "https://");
        upgradedRef.current = true;
      }

      loadTimerRef.current = setTimeout(() => {
        if (attemptRef.current === attempt) {
          teardown();
          fail(upgradedRef.current ? "insecure" : "timeout");
        }
      }, LOAD_TIMEOUT_MS);

      try {
        const nativeHls = audio.canPlayType("application/vnd.apple.mpegurl") !== "";
        if (s.hls && !nativeHls && !import.meta.env.SSR) {
          const { default: Hls } = await import("hls.js");
          if (attemptRef.current !== attempt) return;
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false }) as unknown as HlsLike;
            hlsRef.current = hls;
            hls.on("hlsError", (_e, data) => {
              if ((data as { fatal?: boolean })?.fatal && attemptRef.current === attempt) {
                teardown();
                fail(upgradedRef.current ? "insecure" : "offline");
              }
            });
            hls.loadSource(url);
            hls.attachMedia(audio);
          } else {
            audio.src = url;
          }
        } else {
          audio.src = url;
        }
        await audio.play();
      } catch (e) {
        if (attemptRef.current !== attempt) return;
        const name = (e as DOMException)?.name;
        // AbortError: a newer play() replaced this one. NotAllowedError: the browser wants a tap first.
        if (name === "AbortError") return;
        if (name === "NotAllowedError") {
          clearLoadTimer();
          setStatus("paused");
          return;
        }
        teardown();
        fail(upgradedRef.current ? "insecure" : "offline");
      }
    },
    [fail, reportListening],
  );

  const play = useCallback(
    (s: Station | SavedStation, list?: (Station | SavedStation)[]) => {
      if (list && list.length > 1) setQueue(list.map(toSaved));
      void start(toSaved(s));
    },
    [start],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const s = stationRef.current;
    if (!audio || !s) return;
    if (status === "playing" || status === "loading") {
      audio.pause();
      clearLoadTimer();
      setStatus("paused");
    } else {
      // Live radio: resume at the live edge, not where it was paused.
      void start(s);
    }
  }, [status, start]);

  const stop = useCallback(() => {
    reportListening(true);
    teardown();
    setStatus("idle");
    setError(null);
    setStation(null);
  }, [reportListening]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const s = stationRef.current;
      if (!s || queue.length < 2) return;
      const i = queue.findIndex((q) => q.id === s.id);
      const nextStation = queue[(i + dir + queue.length) % queue.length];
      void start(nextStation);
    },
    [queue, start],
  );
  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    volumeStore.write(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    if (clamped > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (audioRef.current) audioRef.current.muted = !m;
      return !m;
    });
  }, []);

  // Lock screen and headphone controls.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    if (station) {
      ms.metadata = new MediaMetadata({
        title: station.name,
        artist: [station.country, station.tags[0]].filter(Boolean).join(" · "),
        album: "LiveRadio",
        artwork: station.favicon ? [{ src: station.favicon, sizes: "512x512" }] : [{ src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" }],
      });
    }
    ms.playbackState = status === "playing" ? "playing" : status === "paused" ? "paused" : "none";
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* not supported */
      }
    };
    set("play", () => toggle());
    set("pause", () => toggle());
    set("stop", () => stop());
    set("nexttrack", queue.length > 1 ? () => next() : null);
    set("previoustrack", queue.length > 1 ? () => previous() : null);
  }, [station, status, toggle, stop, next, previous, queue.length]);

  const value = useMemo<PlayerContextValue>(
    () => ({ station, status, error, volume, muted, hasQueue: queue.length > 1, play, toggle, stop, next, previous, setVolume, toggleMute }),
    [station, status, error, volume, muted, queue.length, play, toggle, stop, next, previous, setVolume, toggleMute],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
