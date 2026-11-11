import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./forge.css";

type Tone = "gold" | "ghost" | "ember";

export function SealButton({
  tone = "gold",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button className={`seal seal-${tone} ${className}`} {...props}>
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
    <button className={`iron-ring ${pressed ? "is-on" : ""} ${className}`} {...props}>
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
  const width = `${Math.max(0, Math.min(100, pct))}%`;
  return (
    <div className="channel">
      <div className="channel-head">
        {mark}
        <p className="channel-kicker">{kicker}</p>
        {value != null && <span className="num font-display channel-value">{value}</span>}
      </div>
      <div
        className="channel-track"
        role={meter ? "meter" : undefined}
        aria-label={meter?.label}
        aria-valuenow={meter?.now}
        aria-valuemin={meter ? 0 : undefined}
        aria-valuemax={meter?.max}
      >
        <span className={`channel-fill ${hot ? "is-hot" : ""}`} style={{ width }} />
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
}: {
  name: string;
  hp: number;
  max: number;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`hero-pip ${pressed ? "is-on" : ""}`} aria-pressed={pressed} onClick={onClick}>
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
