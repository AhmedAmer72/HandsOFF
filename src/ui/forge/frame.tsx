import type { ReactNode } from "react";
import { OrnatePanel } from "../pack/components";

type Variant = "steel" | "ledger" | "tablet" | "modal" | "compact" | "hero" | "tall" | "square" | "tooltip";

const FRAME = {
  steel: "wide",
  ledger: "parchment",
  tablet: "wide",
  modal: "modal",
  compact: "compact",
  hero: "hero",
  tall: "tall",
  square: "square",
  tooltip: "tooltip",
} as const;

export function ForgedFrame({
  variant = "steel",
  className = "",
  children,
  pad = true,
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
  pad?: boolean;
}) {
  return <OrnatePanel frame={FRAME[variant]} className={className} pad={pad}>{children}</OrnatePanel>;
}
