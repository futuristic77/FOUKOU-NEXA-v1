import type { Metadata } from 'next'
import { LoginView } from '@/components/foukou/login-view'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Accès à l’espace scolaire FOUKOU-NEXA.',
}

export default function ConnexionPage() {
  return <LoginView />
}
