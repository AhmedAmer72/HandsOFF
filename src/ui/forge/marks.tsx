import type { SVGProps } from "react";

type MarkProps = SVGProps<SVGSVGElement>;

function Mark(props: MarkProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props} />;
}

export function CoinMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <circle cx="12" cy="12" r="7.2" />
      <path d="M12 8.2v7.6M9.4 9.7c.6-.8 4.6-.8 5.2 0 .6.8-.2 1.6-2.6 1.8s-3.2 1-2.6 1.8c.6.8 2 .8 2.6.8" />
    </Mark>
  );
}

export function FlameMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.4s4.6 3.8 4.6 8.2a4.6 4.6 0 1 1-9.2 0c0-2 1.1-3.6 2.2-4.7.5 1.4 1.4 2.6 2.4 2.6 0-2.4.5-4.4 0-6.1z" />
    </svg>
  );
}

export function CinderMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.2 18.2 8.4 12 21.8 5.8 8.4 12 2.2zm0 4.2L8.8 9.2 12 16.6l3.2-7.4L12 6.4z" />
    </svg>
  );
}

export function SpikeMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M7 19V8.5L8.4 5 9.8 8.5V19M12 19V6.5L13.4 3 14.8 6.5V19M16.2 19v-8L17.4 8.2 18.6 11V19" />
    </Mark>
  );
}

export function PitMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="4" y="5" width="16" height="14" />
      <path d="M4 9.5h16M4 14.5h16M9.5 5v14M14.5 5v14" />
    </Mark>
  );
}

export function BoulderMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M7 16.5c-2.2-.4-3.4-2.2-2.6-4.2.6-1.6 2.2-2.4 3.2-3.6C8.8 7.2 10 5 12.2 5c2.4 0 3.6 1.8 4.6 3.2 1.2.4 2.8 1.6 3 3.4.3 2.2-1.2 4.2-3.4 4.8H7z" />
    </Mark>
  );
}

export function BaitMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M5 14.5h14l-1.2 3H6.2L5 14.5z" />
      <path d="M9 14.5c.4-2.4 1.4-4 3-4s2.6 1.6 3 4" />
      <circle cx="12" cy="8.2" r="1.1" fill="currentColor" stroke="none" />
    </Mark>
  );
}

export function PossessMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M8 12V8.2a1.7 1.7 0 1 1 3.4 0V12" />
      <path d="M11.4 12V6.6a1.7 1.7 0 1 1 3.4 0V13" />
      <path d="M14.8 11.2V9.2a1.7 1.7 0 1 1 3.4 0v5.2c0 3.2-2.4 5.6-6.4 5.6S5.4 17.6 5.4 14.4v-2.4a1.7 1.7 0 1 1 3.4 0" />
    </Mark>
  );
}

export function PauseMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 6h3.2v12H8V6zm4.8 0H16v12h-3.2V6z" />
    </svg>
  );
}

export function PlayMark(props: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8.5 6.2v11.6L18 12 8.5 6.2z" />
    </svg>
  );
}

export function GearMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </Mark>
  );
}

export function ShieldMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M12 3.2 5.5 6v5.6c0 3.8 2.5 6.6 6.5 8.2 4-1.6 6.5-4.4 6.5-8.2V6L12 3.2z" />
    </Mark>
  );
}

export function WaxSeal({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#8E1B1B" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#E9D8B4" strokeWidth="1.4" />
      <path d="M32 16v32M20 26h24M20 38h24" stroke="#E9D8B4" strokeWidth="1.6" />
    </svg>
  );
}
