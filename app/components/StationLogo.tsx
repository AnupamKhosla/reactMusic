// A station's logo in a printed frame. Many logos are missing or broken; then the station's initials show.
import { useEffect, useRef, useState } from "react";
import { initials } from "~/lib/names";

export function StationLogo({ name, src, size = 56, eager = false }: { name: string; src: string; size?: number; eager?: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [broken, setBroken] = useState(!src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBroken(!src);
    setLoaded(false);
  }, [src]);

  // An image that loaded or failed before the page became interactive fires no React event: check it here.
  useEffect(() => {
    const img = ref.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth === 0) setBroken(true);
    else if (img.naturalWidth >= 8) setLoaded(true);
  }, [src]);

  return (
    <span className="logo-frame" style={{ width: size, height: size }}>
      <span className="num text-ink-2" style={{ fontSize: Math.max(11, Math.round(size / 3.4)) }} aria-hidden="true">
        {initials(name)}
      </span>
      {src && !broken ? (
        <img
          ref={ref}
          src={src}
          alt=""
          width={size}
          height={size}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          data-loaded={loaded ? "" : undefined}
          onError={() => setBroken(true)}
          onLoad={(e) => {
            // Some sites answer with a 1x1 pixel instead of an error.
            if (e.currentTarget.naturalWidth < 8) setBroken(true);
            else setLoaded(true);
          }}
        />
      ) : null}
    </span>
  );
}
