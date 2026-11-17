-- Visitor statistics for /stats. Anonymous: a random id kept in the visitor's browser, no IP address, no cookies.

-- One row per visit (a visit ends after 30 minutes without activity).
CREATE TABLE sessions (
  session      TEXT PRIMARY KEY,
  visitor      TEXT NOT NULL,
  day          TEXT NOT NULL,              -- UTC date the visit started, YYYY-MM-DD
  started      INTEGER NOT NULL,           -- ms since epoch
  last_seen    INTEGER NOT NULL,
  country      TEXT,                       -- from Cloudflare's edge, 2 letters
  device       TEXT,                       -- mobile | tablet | desktop
  browser      TEXT,
  os           TEXT,
  referrer     TEXT,                       -- referring host, or empty for direct
  source       TEXT,                       -- utm_source, else a name for the referrer (google, facebook, ...)
  medium       TEXT,
  campaign     TEXT,
  landing      TEXT,                       -- first page of the visit
  is_new       INTEGER NOT NULL DEFAULT 1, -- 1 = the visitor's first visit ever
  human        INTEGER NOT NULL DEFAULT 0, -- 1 = a real interaction (tap, click, key, scroll) was seen
  bot_reason   TEXT,                       -- set when the visit looks automated: ua | webdriver | datacenter | headless
  pageviews    INTEGER NOT NULL DEFAULT 0,
  plays        INTEGER NOT NULL DEFAULT 0, -- stations that actually started playing
  listen_secs  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX sessions_day ON sessions (day);
CREATE INDEX sessions_visitor ON sessions (visitor);

-- Everything that happened during a visit.
CREATE TABLE events (
  id           INTEGER PRIMARY KEY,
  ts           INTEGER NOT NULL,
  day          TEXT NOT NULL,
  session      TEXT NOT NULL,
  visitor      TEXT NOT NULL,
  type         TEXT NOT NULL,              -- pageview | engage | play | playing | listen | play_error | search | favorite | share
  path         TEXT,
  station      TEXT,                       -- station id
  station_name TEXT,
  value        INTEGER,                    -- seconds for listen
  label        TEXT                        -- search words, error kind, ...
);
CREATE INDEX events_day_type ON events (day, type);
CREATE INDEX events_session ON events (session);

-- Each browser id: when it was first and last seen, for new vs returning.
CREATE TABLE visitors (
  visitor      TEXT PRIMARY KEY,
  first_day    TEXT NOT NULL,
  last_day     TEXT NOT NULL,
  visits       INTEGER NOT NULL DEFAULT 1
);

-- Search engine and other crawler requests for pages, counted per day (they never run the page's script).
CREATE TABLE crawls (
  day          TEXT NOT NULL,
  bot          TEXT NOT NULL,
  hits         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, bot)
);
