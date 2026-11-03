import { redirect } from 'next/navigation'
import { FoukouApp } from '@/components/foukou/app-shell'
import { getCurrentUser } from '@/lib/auth'
import { getSchoolData } from '@/lib/school-data'
import { getHomeDestination } from '@/lib/platform-routing.mjs'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getCurrentUser()
  const destination = getHomeDestination(user)
  if (destination !== '/') redirect(destination)

  const data = await getSchoolData()
  return <FoukouApp data={data} />
}
