'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Check, ImagePlus, Info, Save, Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEstablishment, establishmentInitials } from './establishment-context'
import { DemoNotice, PageHeading } from './shared'

type SettingsTab = 'establishment' | 'year' | 'grading' | 'roles'

type SettingsDraft = {
  establishment: string
  city: string
  country: string
  year: string
  startDate: string
  endDate: string
  coefficient1: string
  coefficient2: string
  coefficient3: string
}

const initialSettings: SettingsDraft = {
  establishment: 'Établissement de démonstration',
  city: 'Abidjan',
  country: 'Côte d’Ivoire',
  year: '2026–2027',
  startDate: '2026-09-07',
  endDate: '2027-06-30',
  coefficient1: '1',
  coefficient2: '1',
  coefficient3: '2',
}

const tabs: { key: SettingsTab; label: string }[] = [
  { key: 'establishment', label: 'Établissement' },
  { key: 'year', label: 'Année scolaire' },
  { key: 'grading', label: 'Règles de calcul' },
  { key: 'roles', label: 'Rôles et accès' },
]

const LOGO_ACCEPT = 'image/png,image/jpeg,image/svg+xml,image/webp'
const MAX_LOGO_BYTES = 2 * 1024 * 1024

export function SettingsView() {
  const { profile, hydrated, updateProfile, clearLogo } = useEstablishment()
  const [tab, setTab] = useState<SettingsTab>('establishment')
  const [draft, setDraft] = useState<SettingsDraft>(initialSettings)
  const [applied, setApplied] = useState(initialSettings)
  const [message, setMessage] = useState('')
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!hydrated) return
    setDraft((current) => ({ ...current, establishment: profile.name, city: profile.city, country: profile.country }))
    setApplied((current) => ({ ...current, establishment: profile.name, city: profile.city, country: profile.country }))
  }, [hydrated, profile.name, profile.city, profile.country])

  function updateField(key: keyof SettingsDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  function applyPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplied(draft)
    if (tab === 'establishment') {
      updateProfile({ name: draft.establishment, city: draft.city, country: draft.country })
      setMessage('Identité de l’établissement appliquée. Le nom et le logo apparaissent désormais sur les bulletins.')
    } else {
      setMessage('Modifications appliquées à cet aperçu uniquement. Aucune sauvegarde durable n’est configurée.')
    }
  }

  function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLogoError('')
    if (!LOGO_ACCEPT.split(',').includes(file.type)) {
      setLogoError('Format non pris en charge. Choisissez une image PNG, JPG, SVG ou WebP.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Image trop lourde : 2 Mo maximum pour préserver la qualité du PDF.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateProfile({ logoDataUrl: reader.result })
        setMessage('Logo appliqué. Il remplace celui de FOUKOU-NEXA sur les bulletins PDF.')
      } else {
        setLogoError('Lecture du fichier impossible. Réessayez.')
      }
    }
    reader.onerror = () => setLogoError('Lecture du fichier impossible. Réessayez.')
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    clearLogo()
    setLogoError('')
    setMessage('Logo retiré. Les bulletins afficheront les initiales de l’établissement.')
  }

  return (
    <div className="section-view">
      <PageHeading
        eyebrow="CONFIGURATION · APERÇU"
        title="Paramètres"
        description="Informations de l’établissement, logo officiel, périodes scolaires, calcul des moyennes et rôles."
      />
      <DemoNotice>L’identité de l’établissement (nom, ville, logo) est conservée dans ce navigateur et réutilisée sur les bulletins PDF. Le reste des paramètres reste un aperçu local.</DemoNotice>

      <div className="settings-layout">
        <Card className="settings-navigation-card">
          <CardHeader className="settings-nav-heading"><span className="panel-title-icon"><Settings2 aria-hidden="true" /></span><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent className="settings-tabs" role="tablist" aria-label="Catégories de paramètres">
            {tabs.map((item) => <button type="button" key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'is-selected' : ''} onClick={() => { setTab(item.key); setMessage('') }}>{item.label}</button>)}
          </CardContent>
          <p className="settings-applied-preview"><span className="settings-preview-dot" />{applied.establishment}</p>
        </Card>

        <Card className="settings-panel">
          <CardHeader className="settings-panel-heading"><div><p className="eyebrow">{tabs.find((item) => item.key === tab)?.label.toLocaleUpperCase('fr-FR')}</p><CardTitle>{tab === 'establishment' ? 'Profil de l’établissement' : tab === 'year' ? 'Calendrier scolaire' : tab === 'grading' ? 'Moyennes et coefficients' : 'Aperçu des accès'}</CardTitle></div><span className="small-demo-tag">APERÇU LOCAL</span></CardHeader>
          {message ? <p className="session-message" role="status">{message}</p> : null}

          {tab === 'roles' ? (
            <CardContent className="roles-content">
              <div className="permission-alert"><Info aria-hidden="true" /><p><strong>Aperçu d’interface seulement.</strong> Ces rôles ne protègent aucune donnée. L’application n’est reliée à aucun système d’authentification ni contrôle d’accès serveur.</p></div>
              <div className="table-scroll">
                <table className="data-table roles-table"><thead><tr><th scope="col">Rôle illustré</th><th scope="col">Élèves</th><th scope="col">Notes</th><th scope="col">Présences</th><th scope="col">Paramètres</th></tr></thead><tbody><tr><th scope="row">Direction</th><td><Check aria-label="Inclus dans la maquette" /></td><td><Check aria-label="Inclus dans la maquette" /></td><td><Check aria-label="Inclus dans la maquette" /></td><td><Check aria-label="Inclus dans la maquette" /></td></tr><tr><th scope="row">Enseignant</th><td>Lecture</td><td>Saisie</td><td>Saisie</td><td>—</td></tr><tr><th scope="row">Vie scolaire</th><td>Lecture</td><td>—</td><td>Saisie</td><td>—</td></tr></tbody></table>
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <form className="settings-form" onSubmit={applyPreview}>
                {tab === 'establishment' ? (
                  <div className="form-grid form-grid-2">
                    <label className="form-field form-field-wide"><span>Nom de l’établissement</span><input value={draft.establishment} onChange={(event) => updateField('establishment', event.target.value)} required /></label>
                    <label className="form-field"><span>Ville</span><input value={draft.city} onChange={(event) => updateField('city', event.target.value)} required /></label>
                    <label className="form-field"><span>Pays</span><select value={draft.country} onChange={(event) => updateField('country', event.target.value)}><option>Côte d’Ivoire</option><option>Sénégal</option><option>Mali</option><option>Burkina Faso</option><option>Autre</option></select></label>

                    <div className="logo-upload-field form-field-wide">
                      <span>Logo de l’établissement</span>
                      <div className="logo-upload-row">
                        <div className="logo-upload-preview">
                          {profile.logoDataUrl ? (
                            <img src={profile.logoDataUrl} alt={`Logo de ${profile.name}`} />
                          ) : (
                            <span className="logo-upload-monogram" aria-hidden="true">{establishmentInitials(profile.name)}</span>
                          )}
                        </div>
                        <div className="logo-upload-copy">
                          <div className="logo-upload-actions">
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><ImagePlus data-icon="inline-start" aria-hidden="true" />{profile.logoDataUrl ? 'Remplacer le logo' : 'Téléverser un logo'}</Button>
                            {profile.logoDataUrl ? <Button type="button" variant="ghost" size="sm" onClick={removeLogo}><Trash2 data-icon="inline-start" aria-hidden="true" />Retirer</Button> : null}
                            <input ref={fileInputRef} type="file" accept={LOGO_ACCEPT} className="visually-hidden" aria-label="Choisir le logo de l’établissement" onChange={handleLogoFile} />
                          </div>
                          {logoError ? <p className="logo-upload-error" role="alert">{logoError}</p> : null}
                          <p className="logo-upload-hint">PNG, JPG, SVG ou WebP · 2 Mo maximum. Le logo remplace celui de FOUKOU-NEXA en-tête des bulletins PDF.</p>
                        </div>
                      </div>
                    </div>

                    <div className="settings-preview-callout"><span className="settings-preview-dot" /><div><strong>Identité dans l’aperçu</strong><span>{draft.establishment} · {draft.city}</span></div></div>
                  </div>
                ) : null}
                {tab === 'year' ? (
                  <div className="form-grid form-grid-2"><label className="form-field"><span>Année scolaire</span><input value={draft.year} onChange={(event) => updateField('year', event.target.value)} required /></label><label className="form-field"><span>Rythme</span><select defaultValue="Trimestres"><option>Trimestres</option><option>Semestres</option></select></label><label className="form-field"><span>Date de rentrée</span><input type="date" value={draft.startDate} onChange={(event) => updateField('startDate', event.target.value)} /></label><label className="form-field"><span>Fin de l’année</span><input type="date" value={draft.endDate} onChange={(event) => updateField('endDate', event.target.value)} /></label></div>
                ) : null}
                {tab === 'grading' ? (
                  <div className="grading-settings"><p>Les coefficients servent à illustrer le calcul affiché dans Notes et bulletins.</p><div className="form-grid form-grid-3"><label className="form-field"><span>Évaluation 1 · coefficient</span><input type="number" min="0.25" step="0.25" value={draft.coefficient1} onChange={(event) => updateField('coefficient1', event.target.value)} /></label><label className="form-field"><span>Évaluation 2 · coefficient</span><input type="number" min="0.25" step="0.25" value={draft.coefficient2} onChange={(event) => updateField('coefficient2', event.target.value)} /></label><label className="form-field"><span>Évaluation 3 · coefficient</span><input type="number" min="0.25" step="0.25" value={draft.coefficient3} onChange={(event) => updateField('coefficient3', event.target.value)} /></label></div><div className="settings-preview-callout"><span className="settings-preview-dot" /><div><strong>Barème de démonstration</strong><span>Notes sur 20 · arrondi au dixième</span></div></div></div>
                ) : null}
                <div className="settings-form-footer"><span>Application à l’aperçu local uniquement</span><Button type="submit"><Save data-icon="inline-start" aria-hidden="true" />Appliquer à l’aperçu</Button></div>
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
