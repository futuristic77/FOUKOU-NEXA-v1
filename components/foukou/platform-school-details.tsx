import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlatformSchoolSummary, SessionUser } from '@/lib/types'
import { PlatformShell } from './platform-shell'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

export function PlatformSchoolDetails({ user, school }: { user: SessionUser; school: PlatformSchoolSummary }) {
  return <PlatformShell user={user} title={school.name} description="Fiche administrative de l’établissement, limitée aux informations nécessaires à la gestion de la plateforme.">
    <Link href="/plateforme" className="platform-back-link"><ArrowLeft aria-hidden="true" />Retour aux établissements</Link>
    <Card className="management-card platform-panel platform-detail-card">
      <CardHeader className="management-card-header">
        <div><p className="eyebrow">INFORMATIONS ADMINISTRATIVES</p><CardTitle>{school.name}</CardTitle><CardDescription>Informations de référence enregistrées sur la plateforme.</CardDescription></div>
      </CardHeader>
      <CardContent>
        <dl className="platform-detail-grid">
          <div><dt>Identifiant établissement</dt><dd className="platform-id">{school.id}</dd></div>
          <div><dt>Ville</dt><dd>{school.city}</dd></div>
          <div><dt>Pays</dt><dd>{school.country}</dd></div>
          <div><dt>Date d’enregistrement</dt><dd><time dateTime={school.createdAt}>{dateFormatter.format(new Date(school.createdAt))}</time></dd></div>
        </dl>
        <p className="platform-scope-note">Aucune donnée d’élèves, de personnel, de notes ou de présence n’est consultée dans cette fiche.</p>
      </CardContent>
    </Card>
  </PlatformShell>
}
