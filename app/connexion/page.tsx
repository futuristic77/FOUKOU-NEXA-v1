import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LoginView } from '@/components/foukou/login-view'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Connexion' }

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/')
  return <LoginView />
}
