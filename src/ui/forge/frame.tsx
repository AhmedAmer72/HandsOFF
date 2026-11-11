import type { ReactNode } from "react";
import "./forge.css";

type Variant = "steel" | "ledger" | "tablet";

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
  return (
    <section className={`forged forged-${variant} ${className}`}>
      <span className="forged-rivet forged-rivet-tl" aria-hidden="true" />
      <span className="forged-rivet forged-rivet-tr" aria-hidden="true" />
      <span className="forged-rivet forged-rivet-bl" aria-hidden="true" />
      <span className="forged-rivet forged-rivet-br" aria-hidden="true" />
      <div className={pad ? "forged-body" : "forged-body forged-body-tight"}>{children}</div>
    </section>
  );
}
