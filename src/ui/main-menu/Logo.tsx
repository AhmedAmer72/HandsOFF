export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display tracking-[0.22em] text-gold ${compact ? "text-sm" : "text-lg"}`}>
      <svg viewBox="0 0 32 32" className={compact ? "h-5 w-5" : "h-7 w-7"} aria-hidden="true">
        <path d="M16 2 28 8v8c0 8-5 12-12 14C9 28 4 24 4 16V8L16 2z" fill="#14100E" stroke="#F2C14E" strokeWidth="1.4" />
        <path d="M16 7v14M11 12h10" stroke="#FF9A3C" strokeWidth="1.4" />
      </svg>
      UNDERREALM
    </span>
  );
}
