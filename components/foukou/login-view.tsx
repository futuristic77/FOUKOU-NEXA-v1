'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLockup } from './brand-mark'

export function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('La connexion réelle n’est pas configurée sur ce projet. Aucune tentative d’authentification n’a été effectuée.')
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Identité FOUKOU-NEXA">
        <Link href="/" className="login-back-link"><ArrowLeft aria-hidden="true" />Retour à l’aperçu</Link>
        <div className="login-brand-content">
          <BrandLockup className="login-brand-art" />
          <p className="login-brand-description">Éducation, technologie et avenir.<br />Un espace scolaire pensé pour accompagner chaque parcours.</p>
        </div>
        <span className="login-edition">ESPACE SCOLAIRE · DÉMONSTRATION</span>
      </section>

      <section className="login-form-side">
        <div className="login-form-wrap">
          <p className="eyebrow">ACCÈS À L’ESPACE SCOLAIRE</p>
          <h1>Bienvenue dans votre espace.</h1>
          <p className="login-intro">Connectez-vous avec les identifiants de votre établissement.</p>
          <div className="login-demo-note" role="note"><LockKeyhole aria-hidden="true" /><p>Authentification non configurée : cette maquette ne vérifie ni ne conserve aucun identifiant.</p></div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="form-field" htmlFor="login-email"><span>Adresse e-mail</span><div className="login-input-wrap"><Mail aria-hidden="true" /><input id="login-email" type="email" autoComplete="username" placeholder="nom@etablissement.ci" required value={email} onChange={(event) => setEmail(event.target.value)} /></div></label>
            <label className="form-field" htmlFor="login-password"><span>Mot de passe</span><div className="login-input-wrap"><LockKeyhole aria-hidden="true" /><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Votre mot de passe" required value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-visibility-button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></label>
            <div className="login-form-meta"><button type="button" className="text-action" onClick={() => setMessage('La récupération de mot de passe nécessite un service d’authentification, absent de cette maquette.')}>Mot de passe oublié ?</button></div>
            {message ? <p className="login-message" role="status">{message}</p> : null}
            <Button className="login-submit" type="submit" size="lg">Se connecter</Button>
          </form>

          <div className="login-divider"><span>OU</span></div>
          <Link href="/" className="demo-access-link">Explorer le tableau de bord de démonstration <span aria-hidden="true">→</span></Link>
          <p className="login-privacy-note">Les formulaires présentés sont un aperçu visuel. Aucun compte n’est créé et aucune donnée n’est envoyée.</p>
        </div>
        <footer className="login-footer"><span>FOUKOU-NEXA · ESPACE SCOLAIRE</span></footer>
      </section>
    </main>
  )
}
