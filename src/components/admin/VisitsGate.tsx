'use client'

import AdminGate from '@/components/admin/AdminGate'
import VisitsView from '@/components/admin/VisitsView'
import type { DailyStat } from '@/lib/analytics'
import type { CampaignRow } from '@/lib/campaign'

export default function VisitsGate({ days, campaigns }: { days: DailyStat[]; campaigns: CampaignRow[] }) {
  return <AdminGate title="방문">{() => <VisitsView days={days} campaigns={campaigns} />}</AdminGate>
}
