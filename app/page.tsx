import { redirect } from 'next/navigation'
import { FoukouApp } from '@/components/foukou/app-shell'
import { getCurrentUser } from '@/lib/auth'
import { getSchoolData } from '@/lib/school-data'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  if (!await getCurrentUser()) redirect('/connexion')
  const data = await getSchoolData()
  return <FoukouApp data={data} />
}
