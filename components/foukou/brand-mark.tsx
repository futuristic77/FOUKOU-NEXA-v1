export function BrandLockup({ className = '' }: { className?: string }) {
  return (
    <div
      className={`brand-lockup-art ${className}`.trim()}
      role="img"
      aria-label="Logo FOUKOU-NEXA et signature APPRENDRE · GRANDIR · DEMAIN, extrait de la planche d’identité fournie"
    />
  )
}

export function BrandMaskArt({ className = '' }: { className?: string }) {
  return <div className={`brand-mask-art ${className}`.trim()} aria-hidden="true" />
}
