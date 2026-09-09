'use client'

import AdminGate from '@/components/admin/AdminGate'
import Overview from '@/components/admin/Overview'
import type { DailyStat } from '@/lib/analytics'
import type { QnaRow } from '@/components/admin/Overview'
import type { SeoFacts } from '@/lib/seoTargets'

/** 서버가 모은 값을 로그인 확인 뒤에 화면으로 넘긴다 */
export default function OverviewGate(props: {
  days: DailyStat[]
  facts: Record<string, SeoFacts>
  content: { total: number; open: number; audioMinutes: number; hubs: number; sitemap: number }
  qna: QnaRow[]
}) {
  return <AdminGate title="관리자 대시보드">{() => <Overview {...props} />}</AdminGate>
}
