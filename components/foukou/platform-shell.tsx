import type { ReactNode } from 'react'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logoutAction } from '@/app/connexion/actions'
import { roleLabels } from '@/lib/permissions.mjs'
import type { SessionUser } from '@/lib/types'
import { BrandLockup } from './brand-mark'
import { PageHeading } from './shared'

export function PlatformShell({ user, title, description, children }: {
  user: SessionUser
  title: string
  description: string
  children: ReactNode
}) {
  return <div className="school-app platform-app">
    <header className="platform-header">
      <Link href="/plateforme" className="platform-brand" aria-label="Accueil de l’administration plateforme">
        <BrandLockup className="platform-brand-art" />
        <span className="platform-brand-copy"><strong>FOUKOU-NEXA</strong><span>Administration plateforme</span></span>
      </Link>
      <div className="platform-user">
        <div className="platform-user-copy"><strong>{user.fullName}</strong><span>{roleLabels[user.role]}</span></div>
        <form action={logoutAction}><Button type="submit" size="sm" variant="secondary"><LogOut data-icon="inline-start" aria-hidden="true" />Se déconnecter</Button></form>
      </div>
    </header>
    <main className="platform-content">
      <PageHeading eyebrow="ESPACE PLATEFORME" title={title} description={description} />
      <div className="platform-content-body">{children}</div>
      <footer className="platform-footer"><span>FOUKOU-NEXA · Administration plateforme</span><span>Les dossiers scolaires restent dans leur espace d’établissement.</span></footer>
    </main>
  </div>
}
