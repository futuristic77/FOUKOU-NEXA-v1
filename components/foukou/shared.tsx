import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions ? <div className="page-heading-actions">{actions}</div> : null}
    </header>
  )
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="demo-notice" role="note">
      <Info aria-hidden="true" />
      <p>
        {children ?? 'Données de test locales : enregistrées uniquement dans ce navigateur, non partagées et réservées aux tests.'}
      </p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state-mark" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
