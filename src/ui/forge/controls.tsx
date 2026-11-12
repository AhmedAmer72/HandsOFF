import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ProgressTrack } from "../pack/components";
import "./forge.css";

type Tone = "gold" | "ghost" | "ember";

export function SealButton({
  tone = "gold",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const toneClass = tone === "ghost" ? "ur-btn-ghost" : tone === "ember" ? "ur-btn-ember" : "";
  return (
    <button className={`ur-btn ${toneClass} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function RingButton({
  pressed = false,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) {
  return (
    <button type="button" className={`ur-ring ${pressed ? "is-on" : ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Medallion({
  mark,
  value,
  label,
  tone = "gold",
  pulse = false,
  labelFor,
  labelHot = false,
}: {
  mark: ReactNode;
  value: ReactNode;
  label: ReactNode;
  tone?: "gold" | "ember" | "blood";
  pulse?: boolean;
  labelFor?: string;
  labelHot?: boolean;
}) {
  return (
    <div className={`medallion medallion-${tone}`} aria-label={labelFor}>
      <span className={`medallion-mark ${pulse ? "vault-tick" : ""}`}>{mark}</span>
      <span className="medallion-copy">
        <span className={`num font-display medallion-value ${pulse ? "vault-tick" : ""}`}>{value}</span>
        <span className={`medallion-label ${labelHot ? "is-hot" : ""}`}>{label}</span>
      </span>
    </div>
  );
}

export function Channel({
  kicker,
  value,
  pct,
  hot = false,
  mark,
  meter,
}: {
  kicker: string;
  value?: ReactNode;
  pct: number;
  hot?: boolean;
  mark?: ReactNode;
  meter?: { now: number; max: number; label: string };
}) {
  return (
    <div className="ur-panel ur-panel-compact">
      <div className="ur-panel-body ur-panel-pad">
        <div className="channel-head">
          {mark}
          <p className={`channel-kicker ${hot ? "text-blood" : ""}`}>{kicker}</p>
          {value != null && <span className="num font-display channel-value">{value}</span>}
        </div>
        <ProgressTrack
          pct={pct}
          label={meter?.label}
          now={meter?.now}
          max={meter?.max}
        />
      </div>
    </div>
  );
}

export function TrapSeal({
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
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`trap-seal ${selected ? "is-on" : ""}`} disabled={disabled} aria-pressed={selected} onClick={onClick}>
      <span className="trap-seal-art">{icon}</span>
      <span className="trap-seal-name">{name}</span>
      <span className="num trap-seal-cost">{cost}</span>
    </button>
  );
}

export function HeroPip({
  name,
  hp,
  max,
  pressed,
  onClick,
  icon,
}: {
  name: string;
  hp: number;
  max: number;
  pressed: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button type="button" className={`ur-tab ${pressed ? "is-on" : ""}`} aria-pressed={pressed} onClick={onClick}>
      {icon}
      <span>{name}</span>
      <span className="num">{hp}/{max}</span>
    </button>
  );
}

export function Notice({ tone = "quiet", children }: { tone?: "quiet" | "gold"; children: ReactNode }) {
  return <p className={`forge-notice forge-notice-${tone}`}>{children}</p>;
}

export function Prompt({ children, testId, className = "" }: { children: ReactNode; testId?: string; className?: string }) {
  return <p className={`forge-prompt ${className}`} data-testid={testId}>{children}</p>;
}
