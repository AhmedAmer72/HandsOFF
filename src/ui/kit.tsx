import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SealButton } from "./forge/controls";
import { ForgedFrame } from "./forge/frame";
import { StatusBadge } from "./pack/components";

type PanelVariant = "steel" | "ledger" | "tablet" | "modal" | "compact" | "hero" | "tall" | "square" | "tooltip";

export function Panel({ children, className = "", variant = "steel" }: { children: ReactNode; className?: string; variant?: PanelVariant }) {
  return <ForgedFrame variant={variant} className={className}>{children}</ForgedFrame>;
}

export function Receipt({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <ForgedFrame variant="ledger" className={className}>{children}</ForgedFrame>;
}

export function Title({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-3xl text-gold">{children}</h2>;
}

export function Num({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`num font-display ${className}`}>{children}</span>;
}

export function Button({ tone = "gold", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "gold" | "ghost" | "ember" }) {
  return <SealButton tone={tone} className={className} {...props} />;
}

export function Chip({ children, hot = false }: { children: ReactNode; hot?: boolean }) {
  return <Status tone={hot ? "danger" : "quiet"}>{children}</Status>;
}

export function Status({ children, tone = "quiet" }: { children: ReactNode; tone?: "quiet" | "live" | "danger" | "mock" }) {
  return <StatusBadge tone={tone}>{children}</StatusBadge>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm text-parchment/80">{label}<span className="mt-1 block [&_input]:min-h-11 [&_input]:border [&_input]:border-bronze/70 [&_select]:min-h-11">{children}</span></label>;
}

export type ChronicleCat = "Combat" | "Heroes" | "Market" | "Economy" | "Traps" | "Rumours" | "Vault" | "Transactions";

export const CHRONICLE: ChronicleCat[] = ["Combat", "Heroes", "Market", "Economy", "Traps", "Rumours", "Vault", "Transactions"];

export function chronicleKind(text: string): ChronicleCat {
  const line = text.toLowerCase();
  if (line.includes("rumour") || line.includes("page") || line.includes("burned") || line.includes("burn ")) return "Rumours";
  if (line.includes("vault") || line.includes("bled")) return "Vault";
  if (line.includes("trap") || line.includes("spike") || line.includes("placed") || line.includes("re-laid") || line.includes("relay")) return "Traps";
  if (line.includes("hits") || line.includes("dies") || line.includes("strike") || line.includes("fight")) return "Combat";
  if (line.includes("kara") || line.includes("brann") || line.includes("ivo") || line.includes("accepted") || line.includes("walked") || line.includes("refused")) return "Heroes";
  if (line.includes("bought") || line.includes("listed") || line.includes("supplied") || line.includes("price") || line.includes("stock")) return "Market";
  if (line.includes("gold") || line.includes("upkeep") || line.includes("fee") || line.includes("cinder")) return "Economy";
  return "Transactions";
}
