// The parts of a page that differ per visitor and live in their browser: recently played (home page) and the
// favourites page. They are drawn here, after the page is shown, so the page everyone else gets stays the same.
import { html } from "../shared/html.ts";
import { moreLink, notice, section, stationGrid } from "../shared/ui.ts";
import { rememberStations } from "./sync.ts";
import { favoritesStore, recentStore } from "./storage.ts";

let confirming = false;

export function drawPersonal(root: ParentNode = document) {
  const favorites = favoritesStore.read();
  const recent = recentStore.read();
  rememberStations(favorites);
  rememberStations(recent);

  for (const slot of root.querySelectorAll<HTMLElement>("[data-personal]")) {
    switch (slot.dataset.personal) {
      case "recent":
        slot.innerHTML = recent.length
          ? section("Recently played", stationGrid(recent.slice(0, 6), "Recently played", 0), { id: "recent", action: moreLink("/favorites", "Favourites") }).value
          : "";
        break;
      case "recent-all":
        slot.innerHTML = recent.length ? section("Recently played", stationGrid(recent, "Recently played", 0)).value : "";
        break;
      case "favorites":
        slot.innerHTML = favorites.length
          ? stationGrid(favorites, "Favourite stations", 0).value
          : notice("No favourites yet", html`Tap the heart on any station to keep it here. <a href="/top" class="underline">Start with the top stations</a>.`).value;
        break;
    }
  }
  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-clear-favorites]")) {
    btn.hidden = favorites.length < 2;
    btn.textContent = confirming ? "Tap again to remove all" : "Clear all";
    btn.classList.toggle("text-red-ink", confirming);
  }
}

/** "Clear all" asks for a second tap before removing every favourite. */
export function clearFavoritesClicked(btn: HTMLButtonElement) {
  if (!confirming) {
    confirming = true;
    drawPersonal();
    btn.addEventListener(
      "blur",
      () => {
        confirming = false;
        drawPersonal();
      },
      { once: true },
    );
    return;
  }
  confirming = false;
  favoritesStore.write([]);
}
