export type Station = {
  id: string;
  name: string;
  stream: string;
  hls: boolean;
  homepage: string;
  favicon: string;
  tags: string[];
  countrycode: string;
  country: string;
  state: string;
  languages: string[];
  codec: string;
  bitrate: number;
  votes: number;
  /** Listens in the last 24 hours, across all players that report to the directory. */
  clicks: number;
  trend: number;
  ok: boolean;
  lastOk: string;
  updated: string;
  geo: [number, number] | null;
};

/** The few fields kept in the browser for favourites and recently played. */
export type SavedStation = Pick<
  Station,
  "id" | "name" | "stream" | "hls" | "favicon" | "countrycode" | "country" | "tags" | "codec" | "bitrate" | "homepage"
>;

/** A station as shown on a card in a list. */
export type CardStation = SavedStation & { clicks: number };

export type Country ={ code: string; name: string; slug: string; count: number };
export type Genre = { name: string; label: string; slug: string; count: number };
export type Language = { name: string; label: string; slug: string; count: number };
