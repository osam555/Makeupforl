import Dashboard from '@/app/admin/dashboard/Dashboard'
import { getWed100Items, wed100Parts } from '@/lib/wed100'

export const dynamic = 'force-dynamic'

/**
 * 100문100답 통계 — 화면은 브라우저에서 돈다(Dashboard.tsx).
 *
 * 문항 갖춤(음성·영문 자막 수)은 여기 서버에서 세어 숫자만 넘긴다. 전에는 클라이언트
 * 컴포넌트가 시드 JSON 을 import 해서 셌는데, 그러면 102문항 답 전문이 공개 JS 파일에
 * 실려 로그인 없이 받아졌다(2026-11-07). 넘기는 것은 숫자와 질문 제목뿐이고,
 * 둘 다 손님 화면에 이미 공개된 것이라 로그인 전 HTML 에 실려도 괜찮다.
 */
export default async function AdminDashboardPage() {
  const items = await getWed100Items()
  return (
    <Dashboard
      coverage={{
        total: items.length,
        withAudio: items.filter((x) => x.audio).length,
        withEn: items.filter((x) => x.cues.every((c) => c.en)).length,
        cueCount: items.reduce((a, x) => a + x.cues.length, 0),
      }}
      questions={Object.fromEntries(items.map((x) => [x.slug, x.question]))}
      parts={wed100Parts.map((p) => ({ part: p.part, title: p.title }))}
    />
  )
}
