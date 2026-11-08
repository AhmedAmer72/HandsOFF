import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-gold/30 bg-panel/90 p-4 text-parchment shadow-panel ${className}`}>{children}</section>;
}

export function Title({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-3xl text-gold">{children}</h2>;
}

export function Button({ tone = "gold", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "gold" | "ghost" | "ember" }) {
  const toneClass = tone === "gold"
    ? "bg-gold text-ink hover:bg-torch"
    : tone === "ember"
      ? "bg-ember text-ink hover:bg-torch"
      : "border border-gold/40 bg-ink/40 text-parchment hover:border-gold hover:text-gold";
  return <button className={`min-h-11 rounded-2xl px-4 py-2 text-sm transition disabled:hover:bg-gold ${toneClass} ${className}`} {...props} />;
}

export function Chip({ children, hot = false }: { children: ReactNode; hot?: boolean }) {
  return <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs ${hot ? "border-blood text-blood" : "border-gold/30 text-parchment"}`}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm text-parchment/80">{label}<span className="mt-1 block">{children}</span></label>;
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
