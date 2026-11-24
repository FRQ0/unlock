type Props = { tone?: "brasa" | "dark" | "light"; size?: number; withText?: boolean; className?: string };

export function LogoMark({ tone = "brasa", size = 32 }: { tone?: Props["tone"]; size?: number }) {
  const fill = tone === "brasa" ? "#FF6A3D" : tone === "dark" ? "#0D0F12" : "#F4F4EF";
  const hole = tone === "dark" ? "#F4F4EF" : "#0D0F12";
  return (
    <svg viewBox="4 14 92 82" width={size} height={size * 0.89} aria-hidden="true" style={{ flex: "0 0 auto" }}>
      <path d="M41 46 V31 A9 9 0 0 1 59 31 V35" fill="none" stroke={fill} strokeWidth="7" strokeLinecap="round" />
      <path d="M14 80 A36 36 0 0 1 86 80 Z" fill={fill} />
      <rect x="8" y="84" width="84" height="8" rx="4" fill={fill} />
      <circle cx="50" cy="62" r="5.5" fill={hole} />
      <rect x="47.5" y="63" width="5" height="11" rx="2.5" fill={hole} />
    </svg>
  );
}

export function Logo({ tone = "brasa", size = 30, withText = true, className = "" }: Props) {
  const onLight = tone === "dark";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Unlock Gastro">
      <LogoMark tone={tone} size={size} />
      {withText && (
        <span className={`display text-[15px] ${onLight ? "text-ink" : "text-gelo"}`}>
          Unlock <span className={onLight ? "text-brasa-ink" : "text-brasa"}>Gastro</span>
        </span>
      )}
    </span>
  );
}
