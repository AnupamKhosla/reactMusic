import { useEffect, useState } from "react";
import { setStatsDisabled, statsDisabled } from "~/lib/analytics.client";

/** Lets anyone switch off the anonymous visit counting for their own browser. */
export function CountMeToggle({ label = "Count my visits in the anonymous visitor numbers" }: { label?: string }) {
  const [ready, setReady] = useState(false);
  const [counted, setCounted] = useState(true);
  useEffect(() => {
    setCounted(!statsDisabled());
    setReady(true);
  }, []);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-line p-4">
      <input
        type="checkbox"
        className="h-5 w-5 accent-[var(--red)]"
        checked={counted}
        disabled={!ready}
        onChange={(e) => {
          setCounted(e.target.checked);
          setStatsDisabled(!e.target.checked);
        }}
      />
      <span>
        {label}
        <span className="block text-sm text-muted">{counted ? "On for this browser." : "Off for this browser. Nothing is sent."}</span>
      </span>
    </label>
  );
}
