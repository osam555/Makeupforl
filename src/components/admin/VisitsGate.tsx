'use client'

import AdminGate from '@/components/admin/AdminGate'
import VisitsView from '@/components/admin/VisitsView'
import type { DailyStat } from '@/lib/analytics'

export default function VisitsGate({ days }: { days: DailyStat[] }) {
  return <AdminGate title="방문">{() => <VisitsView days={days} />}</AdminGate>
}
