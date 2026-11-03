import Link from 'next/link'
import { ArrowUpRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createSchool, deleteSchool } from '@/app/actions'
import type { PlatformSchoolSummary, SessionUser } from '@/lib/types'
import { ActionForm } from './action-form'
import { EmptyState } from './shared'
import { PlatformShell } from './platform-shell'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

export function PlatformDashboard({ user, schools }: { user: SessionUser; schools: PlatformSchoolSummary[] }) {
  const academicYear = new Date().getFullYear()
  return <PlatformShell user={user} title="Gestion des établissements" description="Créez des établissements et consultez leurs informations administratives. Les données scolaires ne sont pas accessibles depuis cet espace.">
    <div className="platform-surface-grid">
      <Card className="management-card platform-panel">
        <CardHeader className="management-card-header">
          <div><p className="eyebrow">NOUVEL ÉTABLISSEMENT</p><CardTitle>Créer un établissement</CardTitle><CardDescription>Enregistrez un nouvel espace scolaire sur FOUKOU-NEXA.</CardDescription></div>
        </CardHeader>
        <CardContent>
          <ActionForm action={createSchool} className="platform-create-form" resetOnSuccess>
            <div className="platform-create-fields">
              <label className="form-field platform-field-wide"><span>Nom de l’établissement</span><input name="name" required minLength={2} maxLength={160} /></label>
              <label className="form-field"><span>Ville</span><input name="city" required maxLength={120} /></label>
              <label className="form-field"><span>Pays</span><input name="country" required maxLength={120} defaultValue="Côte d’Ivoire" /></label>
              <label className="form-field platform-field-wide"><span>Année scolaire</span><input name="academicYear" required minLength={4} maxLength={20} defaultValue={`${academicYear}-${academicYear + 1}`} /></label>
            </div>
            <Button type="submit"><Plus data-icon="inline-start" aria-hidden="true" />Créer l’établissement</Button>
          </ActionForm>
        </CardContent>
      </Card>

      <Card className="management-card platform-panel">
        <CardHeader className="management-card-header">
          <div><p className="eyebrow">RÉPERTOIRE PLATEFORME</p><CardTitle>Établissements enregistrés</CardTitle><CardDescription>{schools.length} établissement{schools.length === 1 ? '' : 's'} au total</CardDescription></div>
        </CardHeader>
        <CardContent className="platform-school-list">
          {schools.map((school) => <article className="platform-school-row" key={school.id}>
            <div className="platform-school-top">
              <h3>{school.name}</h3>
              <Link className="platform-record-link" href={`/plateforme/etablissements/${school.id}`} aria-label={`Consulter les informations de ${school.name}`}>Voir la fiche<ArrowUpRight aria-hidden="true" /></Link>
            </div>
            <dl className="platform-school-meta">
              <div><dt>Localisation</dt><dd>{school.city}, {school.country}</dd></div>
              <div><dt>Enregistré le</dt><dd><time dateTime={school.createdAt}>{dateFormatter.format(new Date(school.createdAt))}</time></dd></div>
            </dl>
            <details className="platform-delete">
              <summary><Trash2 aria-hidden="true" />Zone de suppression</summary>
              <div className="platform-delete-content">
                <p>Cette action supprimera définitivement l’établissement et toutes les données qui lui sont associées.</p>
                <ActionForm action={deleteSchool} confirm={`Confirmez-vous la suppression définitive de ${school.name} et de toutes ses données ?`}>
                  <input type="hidden" name="schoolId" value={school.id} />
                  <label className="form-field"><span>Saisir SUPPRIMER {school.name}</span><input name="confirmation" required maxLength={180} autoComplete="off" /></label>
                  <Button type="submit" variant="destructive">Supprimer l’établissement</Button>
                </ActionForm>
              </div>
            </details>
          </article>)}
          {!schools.length ? <EmptyState title="Aucun établissement" description="Créez le premier établissement pour commencer à utiliser la plateforme." /> : null}
        </CardContent>
      </Card>
    </div>
  </PlatformShell>
}
