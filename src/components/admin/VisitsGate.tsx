'use client'

import AdminGate from '@/components/admin/AdminGate'
import AdminView from '@/components/admin/AdminView'
import VisitsView from '@/components/admin/VisitsView'

/** 방문 기록은 로그인을 확인한 뒤에 /api/admin/view 로 받는다 — HTML 에 싣지 않는다 */
export default function VisitsGate() {
  return (
    <AdminGate title="방문">
      {() => <AdminView view="visits">{({ days }) => <VisitsView days={days} />}</AdminView>}
    </AdminGate>
  )
}
