// Every icon of the site: 24x24, drawn in currentColor so it follows the text colour in both schemes.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Frame({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" />
  </Frame>
);

export const PauseIcon = (p: IconProps) => (
  <Frame {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
  </Frame>
);

export const StopIcon = (p: IconProps) => (
  <Frame {...p}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />
  </Frame>
);

export const NextIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M5 5.5v13l9.5-6.5z" fill="currentColor" stroke="none" />
    <path d="M18 5.5v13" strokeWidth={2.4} />
  </Frame>
);

export const PrevIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M19 5.5v13l-9.5-6.5z" fill="currentColor" stroke="none" />
    <path d="M6 5.5v13" strokeWidth={2.4} />
  </Frame>
);

export const SearchIcon = (p: IconProps) => (
  <Frame {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" />
  </Frame>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Frame>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M20 12H5M11 6l-6 6 6 6" />
  </Frame>
);

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Frame {...p}>
    <path
      d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"
      fill={filled ? "currentColor" : "none"}
    />
  </Frame>
);

export const ShareIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </Frame>
);

export const VolumeIcon = ({ muted, ...p }: IconProps & { muted?: boolean }) => (
  <Frame {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
    {muted ? <path d="m16 9.5 5 5m0-5-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />}
  </Frame>
);

export const CloseIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Frame>
);

export const ExternalIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Frame>
);

export const SpinnerIcon = (p: IconProps) => (
  <Frame {...p} className={`animate-spin motion-reduce:animate-none ${p.className ?? ""}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Frame>
);

export const AlertIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M12 3.5 2.5 20h19z" />
    <path d="M12 10v4.5M12 17.2v.3" />
  </Frame>
);

export const CopyIcon = (p: IconProps) => (
  <Frame {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Frame>
);

export const MenuIcon = (p: IconProps) => (
  <Frame {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Frame>
);

/** The LiveRadio mark: a dial scale with the red needle (traced from the logo artwork, public/icon.svg). */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false" className={className}>
      <rect width="512" height="512" rx="98" fill="var(--bar)" />
      <g fill="var(--on-bar)">
        <rect x="64" y="176" width="44" height="176" rx="22" />
        <rect x="152" y="232" width="44" height="88" rx="22" />
        <rect x="340" y="232" width="44" height="88" rx="22" />
        <rect x="420" y="176" width="44" height="176" rx="22" />
      </g>
      <g fill="var(--red)">
        <rect x="236" y="164" width="44" height="268" rx="22" />
        <path d="M196 72h124l-62 88z" />
      </g>
    </svg>
  );
}
