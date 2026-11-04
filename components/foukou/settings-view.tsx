'use client'

import { useState, type FormEvent } from 'react'
import { Check, Info, Save, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DemoNotice, PageHeading } from './shared'
import { clearLocalTestData, useLocalTestState } from './use-local-test-state'

type SettingsTab = 'establishment' | 'year' | 'grading' | 'roles'

type SettingsDraft = {
  establishment: string
  city: string
  country: string
  periodMode: string
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
  periodMode: 'Trimestres',
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

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>('establishment')
  const draftState = useLocalTestState<SettingsDraft>('settings-draft', initialSettings)
  const appliedState = useLocalTestState<SettingsDraft>('settings-applied', initialSettings)
  const draft = draftState.value
  const setDraft = draftState.setValue
  const applied = appliedState.value
  const setApplied = appliedState.setValue
  const [message, setMessage] = useState('')

  function updateField(key: keyof SettingsDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  function applyPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplied(draft)
    setMessage('Modifications enregistrées sur cet appareil uniquement. Aucune donnée n’est transmise à un serveur.')
  }

  function resetLocalTestData() {
    if (!window.confirm('Réinitialiser les listes, notes, présences et paramètres locaux aux exemples de test ?')) return
    if (!clearLocalTestData()) {
      setMessage('Le navigateur n’a pas permis de réinitialiser les données locales.')
      return
    }
    window.location.reload()
  }

  if (!draftState.ready || !appliedState.ready) {
    return <div className="session-message" role="status">Chargement des paramètres locaux…</div>
  }

  return (
    <div className="section-view">
      <PageHeading
        eyebrow="CONFIGURATION · APERÇU"
        title="Paramètres"
        description="Informations de l’établissement, périodes scolaires, calcul des moyennes et rôles."
      />
      <DemoNotice>Paramètres de test conservés dans ce navigateur uniquement. Ne saisis pas de données réelles ou sensibles.</DemoNotice>

      <div className="settings-layout">
        <Card className="settings-navigation-card">
          <CardHeader className="settings-nav-heading"><span className="panel-title-icon"><Settings2 aria-hidden="true" /></span><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent className="settings-tabs" role="tablist" aria-label="Catégories de paramètres">
            {tabs.map((item) => <button type="button" key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'is-selected' : ''} onClick={() => { setTab(item.key); setMessage('') }}>{item.label}</button>)}
          </CardContent>
          <p className="settings-applied-preview"><span className="settings-preview-dot" />{applied.establishment}</p>
        </Card>

        <Card className="settings-panel">
          <CardHeader className="settings-panel-heading"><div><p className="eyebrow">{tabs.find((item) => item.key === tab)?.label.toLocaleUpperCase('fr-FR')}</p><CardTitle>{tab === 'establishment' ? 'Profil de l’établissement' : tab === 'year' ? 'Calendrier scolaire' : tab === 'grading' ? 'Moyennes et coefficients' : 'Aperçu des accès'}</CardTitle></div><span className="small-demo-tag">NON PERSISTANT</span></CardHeader>
          {draftState.error || appliedState.error ? <p className="session-message" role="alert">Le stockage local des paramètres est indisponible ; les modifications ne sont pas garanties.</p> : null}
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
                  <div className="form-grid form-grid-2"><label className="form-field form-field-wide"><span>Nom de l’établissement</span><input value={draft.establishment} onChange={(event) => updateField('establishment', event.target.value)} required /></label><label className="form-field"><span>Ville</span><input value={draft.city} onChange={(event) => updateField('city', event.target.value)} required /></label><label className="form-field"><span>Pays</span><select value={draft.country} onChange={(event) => updateField('country', event.target.value)}><option>Côte d’Ivoire</option><option>Sénégal</option><option>Autre</option></select></label><div className="settings-preview-callout"><span className="settings-preview-dot" /><div><strong>Nom dans l’aperçu</strong><span>{draft.establishment} · {draft.city}</span></div></div></div>
                ) : null}
                {tab === 'year' ? (
                  <div className="form-grid form-grid-2"><label className="form-field"><span>Année scolaire</span><input value={draft.year} onChange={(event) => updateField('year', event.target.value)} required /></label><label className="form-field"><span>Rythme</span><select value={draft.periodMode} onChange={(event) => updateField('periodMode', event.target.value)}><option>Trimestres</option><option>Semestres</option></select></label><label className="form-field"><span>Date de rentrée</span><input type="date" value={draft.startDate} onChange={(event) => updateField('startDate', event.target.value)} /></label><label className="form-field"><span>Fin de l’année</span><input type="date" value={draft.endDate} onChange={(event) => updateField('endDate', event.target.value)} /></label></div>
                ) : null}
                {tab === 'grading' ? (
                  <div className="grading-settings"><p>Les coefficients servent à illustrer le calcul affiché dans Notes et bulletins.</p><div className="form-grid form-grid-3"><label className="form-field"><span>Évaluation 1 · coefficient</span><input type="number" min="0.25" step="0.25" value={draft.coefficient1} onChange={(event) => updateField('coefficient1', event.target.value)} /></label><label className="form-field"><span>Évaluation 2 · coefficient</span><input type="number" min="0.25" step="0.25" value={draft.coefficient2} onChange={(event) => updateField('coefficient2', event.target.value)} /></label><label className="form-field"><span>Évaluation 3 · coefficient</span><input type="number" min="0.25" step="0.25" value={draft.coefficient3} onChange={(event) => updateField('coefficient3', event.target.value)} /></label></div><div className="settings-preview-callout"><span className="settings-preview-dot" /><div><strong>Barème de démonstration</strong><span>Notes sur 20 · arrondi au dixième</span></div></div></div>
                ) : null}
                <div className="settings-form-footer"><span>Enregistré sur cet appareil uniquement</span><Button type="submit"><Save data-icon="inline-start" aria-hidden="true" />Appliquer à l’aperçu</Button></div>
              </form>
            </CardContent>
          )}
        </Card>
      </div>
      <Card className="settings-panel">
        <CardHeader><CardTitle>Données locales de test</CardTitle></CardHeader>
        <CardContent><p>Les exemples et tes modifications restent dans ce navigateur. Cette action les réinitialise aux exemples de test initiaux.</p><Button variant="destructive" type="button" onClick={resetLocalTestData}>Réinitialiser les données de test</Button></CardContent>
      </Card>
    </div>
  )
}
