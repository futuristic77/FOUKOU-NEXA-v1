'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLockup } from './brand-mark'
import { loginAction } from '@/app/connexion/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return <Button className="login-submit" type="submit" size="lg" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'}</Button>
}

export function LoginView() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, action] = useActionState(loginAction, null)
  return <main className="login-page">
    <section className="login-brand-panel" aria-label="Identité FOUKOU-NEXA"><div className="login-brand-content"><BrandLockup className="login-brand-art" /><p className="login-brand-description">Éducation, technologie et avenir.<br />Un espace scolaire pensé pour accompagner chaque parcours.</p></div><span className="login-edition">ESPACE SCOLAIRE · ACCÈS SÉCURISÉ</span></section>
    <section className="login-form-side"><div className="login-form-wrap"><p className="eyebrow">ACCÈS À L’ESPACE SCOLAIRE</p><h1>Bienvenue dans votre espace.</h1><p className="login-intro">Connectez-vous avec les identifiants de votre établissement.</p><div className="login-demo-note" role="note"><LockKeyhole aria-hidden="true" /><p>Votre session est sécurisée et expire automatiquement. Les accès dépendent du rôle attribué par votre établissement.</p></div>
      <form className="login-form" action={action}>
        <label className="form-field" htmlFor="login-email"><span>Adresse e-mail</span><div className="login-input-wrap"><Mail aria-hidden="true" /><input id="login-email" name="email" type="email" autoComplete="username" placeholder="nom@etablissement.ci" maxLength={254} required /></div></label>
        <label className="form-field" htmlFor="login-password"><span>Mot de passe</span><div className="login-input-wrap"><LockKeyhole aria-hidden="true" /><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Votre mot de passe" maxLength={256} required /><button type="button" className="password-visibility-button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></label>
        {state && !state.ok ? <p className="login-message action-error" role="alert">{state.message}</p> : null}
        <SubmitButton />
      </form><p className="login-privacy-note">En cas d’oubli du mot de passe, contactez un administrateur de votre établissement pour réinitialiser votre accès.</p>
    </div><footer className="login-footer"><span>FOUKOU-NEXA · ESPACE SCOLAIRE</span></footer></section>
  </main>
}
