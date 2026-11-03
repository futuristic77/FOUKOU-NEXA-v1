import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PlatformDashboard } from '@/components/foukou/platform-dashboard'
import { getCurrentUser } from '@/lib/auth'
import { getPlatformSchools } from '@/lib/platform-data'
import { isPlatformAdmin } from '@/lib/permissions.mjs'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Administration plateforme', robots: { index: false, follow: false } }

export default async function PlatformPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/connexion')
  if (user.role !== 'super_admin') redirect('/')
  if (!isPlatformAdmin(user)) notFound()

  const schools = await getPlatformSchools()
  return <PlatformDashboard user={user} schools={schools} />
}
