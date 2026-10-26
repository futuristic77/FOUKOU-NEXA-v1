'use client'

import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { ArrowRight, Megaphone, Plus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Announcement } from './types'
import { DemoNotice, EmptyState, PageHeading } from './shared'

export function CommunicationView({
  announcements,
  setAnnouncements,
}: {
  announcements: Announcement[]
  setAnnouncements: Dispatch<SetStateAction<Announcement[]>>
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState('Toutes')
  const [title, setTitle] = useState('')
  const [audience, setAudience] = useState('Toutes les familles')
  const [date, setDate] = useState('')
  const [summary, setSummary] = useState('')
  const [message, setMessage] = useState('')

  const visibleAnnouncements = useMemo(() => announcements.filter((announcement) => filter === 'Toutes' || announcement.status === filter), [announcements, filter])

  function addDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !summary.trim()) return
    const draft: Announcement = {
      id: `DEMO-${Date.now().toString().slice(-5)}`,
      title: title.trim(),
      audience,
      date: date ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`)) : 'À planifier',
      status: 'Brouillon',
      summary: summary.trim(),
    }
    setAnnouncements((current) => [draft, ...current])
    setTitle('')
    setDate('')
    setSummary('')
    setFormOpen(false)
    setMessage('Brouillon ajouté à cette session de démonstration. Aucun message n’a été envoyé aux familles.')
  }

  return (
    <div className="section-view">
      <PageHeading
        eyebrow="INFORMATIONS · MESSAGES"
        title="Communication"
        description="Préparez les annonces de l’établissement et consultez les informations partagées."
        actions={<Button onClick={() => { setFormOpen((open) => !open); setMessage('') }}><Plus data-icon="inline-start" aria-hidden="true" />Rédiger une annonce</Button>}
      />
      <DemoNotice>Les annonces et brouillons sont fictifs. Les messages rédigés restent locaux et ne sont jamais envoyés.</DemoNotice>

      <div className="communication-summary-grid">
        <Card className="communication-summary-card"><CardContent><span className="summary-icon"><Megaphone aria-hidden="true" /></span><span className="summary-label">Annonces d’exemple</span><strong>{announcements.length}</strong><span className="summary-foot">dans cette session</span></CardContent></Card>
        <Card className="communication-summary-card communication-summary-highlight"><CardContent><span className="summary-icon"><Send aria-hidden="true" /></span><span className="summary-label">Envoi aux familles</span><strong>Non connecté</strong><span className="summary-foot">aucune diffusion active</span></CardContent></Card>
      </div>

      {message ? <p className="session-message" role="status">{message}</p> : null}

      {formOpen ? (
        <Card className="announcement-form-card">
          <CardHeader className="inline-form-heading"><div><p className="eyebrow">NOUVELLE ANNONCE · BROUILLON</p><CardTitle>Préparer un message</CardTitle></div><span className="small-demo-tag">NON ENVOYÉ</span></CardHeader>
          <CardContent>
            <form onSubmit={addDraft} className="announcement-form">
              <div className="form-grid form-grid-2">
                <label className="form-field"><span>Titre de l’annonce</span><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Réunion de rentrée" /></label>
                <label className="form-field"><span>Destinataires</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option>Toutes les familles</option><option>Équipe pédagogique</option><option>Familles du collège</option><option>Familles du lycée</option></select></label>
                <label className="form-field"><span>Date prévue (facultatif)</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
                <label className="form-field form-field-wide"><span>Message</span><textarea required value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} placeholder="Rédigez un texte de démonstration…" /></label>
              </div>
              <div className="inline-form-footer"><span>Le brouillon sera ajouté à l’aperçu, sans envoi.</span><Button type="submit">Ajouter à la démo <ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="announcement-list-card">
        <CardHeader className="management-card-header"><div><p className="eyebrow">FIL D’INFORMATIONS</p><CardTitle>Annonces de démonstration</CardTitle></div><label className="form-field compact-form-field"><span>Filtrer</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>Toutes</option><option>Publié</option><option>Brouillon</option></select></label></CardHeader>
        <CardContent className="announcement-list">
          {visibleAnnouncements.map((announcement) => <article className="announcement-row" key={announcement.id}><span className="announcement-icon"><Megaphone aria-hidden="true" /></span><div className="announcement-body"><div className="announcement-meta"><span className={`status-pill ${announcement.status === 'Publié' ? 'status-positive' : 'status-review'}`}><span aria-hidden="true" />{announcement.status}</span><span>{announcement.audience}</span><time>{announcement.date}</time></div><h2>{announcement.title}</h2><p>{announcement.summary}</p></div><span className="announcement-demo-id">{announcement.id}</span></article>)}
          {visibleAnnouncements.length === 0 ? <EmptyState title="Aucune annonce dans ce filtre" description="Choisissez un autre état pour afficher les éléments de démonstration." /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
