import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PlatformSchoolDetails } from '@/components/foukou/platform-school-details'
import { getCurrentUser } from '@/lib/auth'
import { getPlatformSchool } from '@/lib/platform-data'
import { isPlatformAdmin } from '@/lib/permissions.mjs'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Fiche établissement', robots: { index: false, follow: false } }

type PlatformSchoolPageProps = { params: Promise<{ schoolId: string }> }

export default async function PlatformSchoolPage({ params }: PlatformSchoolPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/connexion')
  if (user.role !== 'super_admin') redirect('/')
  if (!isPlatformAdmin(user)) notFound()

  const { schoolId } = await params
  const school = await getPlatformSchool(schoolId)
  if (!school) notFound()

  return <PlatformSchoolDetails user={user} school={school} />
}
