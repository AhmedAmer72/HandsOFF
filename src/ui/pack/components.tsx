import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./pack.css";
import { ui } from "./urls";

type FrameName = "wide" | "tall" | "square" | "compact" | "parchment" | "modal" | "tooltip" | "hero";

export function OrnatePanel({
  frame = "wide",
  className = "",
  children,
  pad = true,
  as: Tag = "section",
}: {
  frame?: FrameName;
  className?: string;
  children: ReactNode;
  pad?: boolean;
  as?: "section" | "div" | "li";
}) {
  return (
    <Tag className={`ur-panel ur-panel-${frame} ${className}`}>
      <div className={pad ? "ur-panel-body ur-panel-pad" : "ur-panel-body"}>{children}</div>
    </Tag>
  );
}

export function GameIcon({ src, className = "" }: { src: string; className?: string }) {
  return <img src={src} alt="" draggable={false} className={`ur-icon ${className}`} />;
}

export function ResourcePanel({
  icon,
  value,
  label,
  labelFor,
  labelHot = false,
  pulse = false,
  children,
}: {
  icon: string;
  value: ReactNode;
  label: ReactNode;
  labelFor?: string;
  labelHot?: boolean;
  pulse?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="ur-resource" aria-label={labelFor}>
      <img className="ur-resource-icon" src={icon} alt="" draggable={false} />
      <span className="ur-resource-copy">
        <span className={`num font-display ur-resource-value ${pulse ? "vault-tick" : ""}`}>{value}</span>
        <span className={`ur-resource-label ${labelHot ? "is-hot" : ""}`}>{label}</span>
        {children}
      </span>
    </div>
  );
}

export function CinderPips({ value, cap }: { value: number; cap: number }) {
  const shown = Math.max(0, cap);
  return (
    <span className="ur-pips" aria-hidden="true">
      {Array.from({ length: shown }, (_, index) => (
        <img key={index} src={index < value ? ui.indicator.pipFull : ui.indicator.pipEmpty} alt="" draggable={false} />
      ))}
    </span>
  );
}

export function ProgressTrack({
  pct,
  track = "progress",
  label,
  now,
  max,
}: {
  pct: number;
  track?: "progress" | "health";
  label?: string;
  now?: number;
  max?: number;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div
      className="ur-progress"
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuenow={now}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={max}
    >
      <img className="ur-progress-track" src={track === "health" ? ui.indicator.health : ui.indicator.track} alt="" draggable={false} />
      <div className="ur-progress-clip" style={{ width: `${width}%` }}>
        <img className="ur-progress-fill" src={ui.indicator.fill} alt="" draggable={false} />
      </div>
    </div>
  );
}

export function TrapCard({
  selected,
  disabled,
  name,
  cost,
  icon,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  name: string;
  cost: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`ur-trap ${selected ? "is-on" : ""}`} disabled={disabled} aria-pressed={selected} onClick={onClick}>
      <img className="ur-trap-icon" src={icon} alt="" draggable={false} />
      <span className="ur-trap-name">{name}</span>
      <span className="num ur-trap-cost">{cost}</span>
    </button>
  );
}

export function CircularGameButton({
  pressed = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) {
  return (
    <button type="button" className={`ur-ring ${pressed ? "is-on" : ""}`} {...props}>
      {children}
    </button>
  );
}

export function ItemSlot({ children }: { children?: ReactNode }) {
  return <span className="ur-slot">{children}</span>;
}

export function StatusBadge({
  children,
  tone = "quiet",
}: {
  children: ReactNode;
  tone?: "quiet" | "live" | "danger" | "mock";
}) {
  return <span className={`ur-badge ur-badge-${tone}`}>{children}</span>;
}

export function Divider() {
  return <img className="ur-divider" src={ui.ornament.divider} alt="" draggable={false} />;
}

export function WaxSealMark() {
  return <img className="ur-wax" src={ui.ornament.wax} alt="" draggable={false} />;
}

export function CornerOrnament() {
  return <img className="ur-corner" src={ui.ornament.corner} alt="" draggable={false} />;
}
