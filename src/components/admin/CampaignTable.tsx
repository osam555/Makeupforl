import { Empty, Panel } from '@/components/admin/AdminUI'
import type { CampaignRow } from '@/lib/campaign'

/**
 * 캠페인 꼬리표별 도착 → 상담 신청 → 예약함.
 *
 * 방문 화면과 상담 신청 화면에 같은 표를 둔다. 광고를 켤지 끌지는 「신청 1건당·예약 1건당
 * 비용」으로 정하는데, 도착은 방문 기록에, 신청·예약은 상담 신청에 있어 한쪽 화면만 보면
 * 나머지 반을 머리로 맞춰야 한다. 광고비는 여기 없다 — Buffer·광고 화면의 금액을 이 숫자로 나눈다.
 *
 * 기간을 자르지 않고 최근 1년 전체를 센다. 꼬리표가 쇼츠·광고마다 따로라 꼬리표 하나가 곧
 * 캠페인 하나의 기간이다. 「예약함」 은 상담 신청 화면에서 단추를 눌러야 오른다.
 */
export default function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—')
  return (
    <Panel title="캠페인별 (쇼츠·광고 꼬리표)" hint="주소의 ?from= — 최근 1년, 예약 많은 순">
      {rows.length === 0 ? (
        <Empty>
          아직 꼬리표로 들어온 방문이 없습니다. 쇼츠·광고 링크 끝에 ?from=yt-shorts-01 처럼 붙여 주세요
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums text-[var(--a-3a322e)]">
            <thead>
              <tr className="border-b border-[var(--a-d4c7be)] text-[var(--a-8a7a72)]">
                <th className="py-1.5 text-left font-bold">꼬리표</th>
                <th className="py-1.5 pl-2 text-right font-bold">도착</th>
                <th className="py-1.5 pl-2 text-right font-bold">신청</th>
                <th className="py-1.5 pl-2 text-right font-bold">예약함</th>
                <th className="py-1.5 pl-2 text-right font-bold">도착→신청</th>
                <th className="py-1.5 pl-2 text-right font-bold">신청→예약</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.campaign} className="border-b border-[var(--a-efe7df)]">
                  <td className="py-1.5 font-bold text-[var(--a-2e2724)]">{r.campaign}</td>
                  <td className="py-1.5 pl-2 text-right">{r.arrivals}</td>
                  <td className="py-1.5 pl-2 text-right">{r.leads}</td>
                  <td className="py-1.5 pl-2 text-right font-bold">{r.booked}</td>
                  <td className="py-1.5 pl-2 text-right text-[var(--a-8a7a72)]">{pct(r.leads, r.arrivals)}</td>
                  <td className="py-1.5 pl-2 text-right text-[var(--a-8a7a72)]">{pct(r.booked, r.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[0.6875rem] leading-relaxed text-[var(--a-8a7a72)]">
            도착은 그 꼬리표로 창을 처음 연 수, 신청은 그 창에서 설문을 낸 수입니다. 꼬리표 없이 들어온 신청은
            여기 없습니다. 2026-11-04 전 신청에는 꼬리표가 없습니다.
          </p>
        </div>
      )}
    </Panel>
  )
}
