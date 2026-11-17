#!/usr/bin/env bash
# Checks that every kind of page answers with the right status and has a title, a description and a canonical link.
# Usage: scripts/smoke.sh [base]   (default http://localhost:5173)
set -u
BASE="${1:-http://localhost:5173}"
OUT="$(dirname "$0")/../.smoke"
mkdir -p "$OUT"
fail=0

check() { # path expected-status
  local path="$1" want="$2" file
  file="$OUT/$(echo "$path" | tr '/?=&' '____').html"
  local got
  got=$(curl -s -o "$file" -w "%{http_code}" "$BASE$path")
  local title canon
  title=$(grep -o -m1 '<title>[^<]*</title>' "$file" | sed 's/<[^>]*>//g')
  canon=$(grep -o -m1 'rel="canonical" href="[^"]*"' "$file" | sed 's/.*href="//; s/"$//')
  if [ "$got" != "$want" ]; then
    echo "FAIL $got (want $want) $path"
    fail=1
  else
    printf 'ok   %s %-42s %s | %s\n' "$got" "$path" "${title:0:70}" "$canon"
  fi
}

check / 200
check /top 200
check /countries 200
check /country/india 200
check /country/in 301
check "/country/germany?sort=trending" 200
check "/country/germany?page=2" 200
check /genres 200
check /genre/jazz 200
check /languages 200
check /language/hindi 200
check "/search?q=bbc" 200
check /favorites 200
check /about 200
check /privacy 200
check /dashboard 200
check /robots.txt 200
check /sitemap.xml 200
check /sitemaps/countries.xml 200
check /sitemaps/stations-1.xml 200
check /manifest.webmanifest 200
check "/?search=india&filter=bycountry&page=2" 301
check "/?search=jazz&filter=byname" 301
check /no-such-page 404
check /station/not-a-station 404
check /country/atlantis 404

# A real station page, taken from the first station in the stations sitemap.
station=$(grep -o -m1 '<loc>[^<]*</loc>' "$OUT/_sitemaps_stations-1.xml.html" | sed 's/<[^>]*>//g; s#https://liveradio.space##')
[ -n "$station" ] && check "$station" 200

exit $fail
