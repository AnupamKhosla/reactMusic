// When to show loading skeletons. A short delay keeps fast (cached) loads from flashing a skeleton.
import { useEffect, useState } from "react";
import { useLocation, useNavigation } from "react-router";

export const SKELETON_DELAY_MS = 120;

/** True once `on` has stayed true for `ms`; false again as soon as `on` turns false. */
export function useDelayed(on: boolean, ms = SKELETON_DELAY_MS): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) {
      setShown(false);
      return;
    }
    const timer = window.setTimeout(() => setShown(true), ms);
    return () => window.clearTimeout(timer);
  }, [on, ms]);
  return on && shown;
}

/** A different page is loading (History API navigation): the whole page shows a skeleton. */
export function usePageLoading(): boolean {
  const navigation = useNavigation();
  const location = useLocation();
  return useDelayed(navigation.state === "loading" && navigation.location.pathname !== location.pathname);
}

/** The same list is loading another page, order or query: only its station grid shows a skeleton. */
export function useListLoading(): boolean {
  const navigation = useNavigation();
  const location = useLocation();
  const next = navigation.location;
  return useDelayed(navigation.state === "loading" && !!next && next.pathname === location.pathname && next.search !== location.search);
}
