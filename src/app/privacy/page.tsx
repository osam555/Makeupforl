import type { Metadata } from 'next'
import SubHero from '@/components/layout/SubHero'

export const metadata: Metadata = {
  title: '개인정보처리방침 | 메이크업포엘',
  description: '메이크업포엘 개인정보처리방침 및 이메일무단수집거부 안내입니다.',
  robots: { index: false, follow: true },
}

/**
 * 옛 사이트 /sub/pop_privacy.html · /sub/pop_email.html 의 내용을 그대로 옮겼다.
 * 푸터가 모든 페이지에서 /privacy 와 /privacy#email 을 가리키는데 페이지가 없어
 * 404 가 나고 있었다. 개인정보처리방침은 법정 필수 고지 사항이기도 하다.
 *
 * 옛 방침은 회원가입·온라인 결제·타겟 광고 쿠키를 전제로 쓰여 있었는데
 * 새 사이트에는 그런 기능이 없다. 예약 문의 폼도 뺐고 상담은 전화·카카오톡으로만
 * 받는다. 사실과 다른 고지는 그 자체로 문제가 되므로 실제 동작에 맞춰 고쳤다.
 *
 * 아직 원장님 확인이 필요한 것
 *   - 6항 위탁 대상자: 도메인을 옮기면 (주)쓰리애니아이앤시가 아니게 된다
 *   - 9항 부서명·책임자 성명이 비어 있다
 */

type Block = { h: string; body: (string | string[])[] }

const SECTIONS: Block[] = [
  {
    h: '1. 수집하는 개인정보 항목',
    body: [
      '회사는 웹사이트에서 개인정보를 직접 수집하지 않습니다. 상담과 예약은 전화 또는 카카오톡 채널로만 접수합니다.',
      [
        '전화 · 카카오톡 상담',
        '수집항목 : 이름, 연락처, 상담내용 등',
        '수집방법 : 통화 및 카카오톡 대화 (웹사이트를 통한 입력 없음)',
      ],
    ],
  },
  {
    h: '2. 개인정보의 수집 및 이용목적',
    body: [
      '회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.',
      '서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 문의/답변',
    ],
  },
  {
    h: '3. 개인정보의 보유 및 이용기간',
    body: [
      '원칙적으로, 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계법령에서 정한 일정한 기간 동안 해당 기록을 보관합니다.',
      [
        '보존 항목 및 보존 근거',
        '계약 또는 청약철회 등에 관한 기록 보존 기간 : 3년',
        '계약 또는 청약철회 등에 관한 기록 : 5년 (전자상거래등에서의 소비자보호에 관한 법률)',
        '대금결제 및 재화 등의 공급에 관한 기록 : 5년 (전자상거래등에서의 소비자보호에 관한 법률)',
        '소비자의 불만 또는 분쟁처리에 관한 기록 : 3년 (전자상거래등에서의 소비자보호에 관한 법률)',
      ],
    ],
  },
  {
    h: '4. 개인정보의 파기절차 및 방법',
    body: [
      '회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.',
      [
        '파기절차',
        '상담 과정에서 알려주신 정보는 목적이 달성된 후, 내부 방침 및 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정 기간 보관된 뒤 파기됩니다.',
        '보관 중인 개인정보는 법률에 의한 경우가 아니고서는 보관 목적 외의 다른 용도로 이용되지 않습니다.',
      ],
      [
        '파기방법',
        '전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하고, 종이에 기록된 경우에는 분쇄하거나 소각하여 파기합니다.',
      ],
    ],
  },
  {
    h: '5. 개인정보 제공',
    body: [
      '회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.',
      '이용자들이 사전에 동의한 경우 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우',
    ],
  },
  {
    h: '6. 호스팅 및 유지보수',
    body: [
      '회사는 서비스 이행을 위해 아래와 같이 외부 전문업체에 위탁하여 운영하고 있습니다.',
      ['위탁 대상자 : (주)쓰리애니아이앤시', '위탁업무 내용 : 웹사이트 및 시스템 관리(호스팅 / 유지보수)'],
    ],
  },
  {
    h: '7. 이용자 및 법정대리인의 권리와 그 행사방법',
    body: [
      '이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 삭제를 요청할 수도 있습니다.',
      '본 웹사이트에는 회원가입 기능이 없으므로, 조회·정정·삭제를 원하시는 경우 아래 개인정보관리책임자에게 전화 또는 이메일로 연락해 주시면 지체없이 조치하겠습니다.',
      '귀하가 개인정보의 오류에 대한 정정을 요청하신 경우에는 정정을 완료하기 전까지 당해 개인정보를 이용 또는 제공하지 않습니다.',
      '또한 잘못된 개인정보를 제3자에게 이미 제공한 경우에는 정정 처리결과를 제3자에게 지체없이 통지하여 정정이 이루어지도록 하겠습니다.',
      '회사는 이용자의 요청에 의해 해지 또는 삭제된 개인정보는 "회사가 수집하는 개인정보의 보유 및 이용기간"에 명시된 바에 따라 처리하고 그 외의 용도로 열람 또는 이용할 수 없도록 처리하고 있습니다.',
      '만 14세 미만 아동의 경우, 법정대리인이 아동의 개인정보를 조회하거나 수정할 권리, 수집 및 동의를 철회할 권리를 가집니다.',
    ],
  },
  {
    h: '8. 개인정보 자동수집 장치의 설치, 운영 및 그 거부에 관한 사항',
    body: [
      '회사는 광고나 개인 맞춤 서비스를 위한 쿠키를 사용하지 않습니다. 웹사이트 이용 현황을 파악하기 위해 방문 수를 집계하는 도구를 쓰고 있으나, 이 도구는 쿠키를 사용하지 않으며 개인을 식별할 수 있는 정보를 수집하지 않습니다.',
      [
        '브라우저에만 저장되는 정보',
        '[혼주메이크업 100문100답] 에서 어디까지 들으셨는지, 글자 크기를 어떻게 고르셨는지를 이용자의 브라우저 안에만 저장합니다.',
        '이 정보는 회사 서버로 전송되지 않으며, 브라우저의 인터넷 사용 기록을 지우면 함께 삭제됩니다.',
      ],
      [
        '저장을 원하지 않으실 때',
        '웹브라우저의 설정에서 사이트 데이터 저장을 차단하거나, 저장된 데이터를 삭제하실 수 있습니다.',
        '차단하시더라도 사이트 이용에는 지장이 없으며, 이어듣기 위치와 글자 크기가 기억되지 않을 뿐입니다.',
      ],
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SubHero title="개인정보처리방침" />

      <div className="mfl-contain max-w-[900px] pb-24">
        <section className="rounded-2xl bg-[#FDF4F3] p-7 sm:p-9">
          <p className="text-[16px] leading-[1.9] text-gray-700">
            &apos;메이크업포엘&apos;은 (이하 &apos;회사&apos;는) 고객님의 개인정보를 중요시하며,
            &quot;정보통신망 이용촉진 및 정보보호&quot;에 관한 법률을 준수하고 있습니다.
          </p>
          <p className="mt-4 text-[16px] leading-[1.9] text-gray-700">
            회사는 개인정보처리방침을 통하여 고객님께서 제공하시는 개인정보가 어떠한 용도와 방식으로
            이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
          </p>
          <p className="mt-4 text-[16px] leading-[1.9] text-gray-700">
            회사는 개인정보처리방침을 개정하는 경우 웹사이트 공지사항(또는 개별공지)을 통하여 공지할
            것입니다.
          </p>
          <p className="mt-5 text-[16px] font-bold text-[#F46E65]">
            본 방침은 2023년 1월 20일부터 시행됩니다.
          </p>
        </section>

        {SECTIONS.map((s) => (
          <section key={s.h} className="mt-12">
            <h2 className="text-[19px] font-bold text-gray-900 sm:text-[21px]">{s.h}</h2>
            <div className="mt-4 space-y-4">
              {s.body.map((b, i) =>
                Array.isArray(b) ? (
                  <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                    <p className="font-bold text-gray-900">{b[0]}</p>
                    <ul className="mt-2.5 space-y-2">
                      {b.slice(1).map((t) => (
                        <li
                          key={t}
                          className="flex gap-2 text-[15px] leading-[1.85] text-gray-700"
                        >
                          <span className="text-[#F46E65]">·</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p key={i} className="text-[16px] leading-[1.9] text-gray-700">
                    {b}
                  </p>
                ),
              )}
            </div>
          </section>
        ))}

        {/* 9. 민원 — 연락처가 있어 따로 짠다 */}
        <section className="mt-12">
          <h2 className="text-[19px] font-bold text-gray-900 sm:text-[21px]">
            9. 개인정보에 관한 민원서비스
          </h2>
          <p className="mt-4 text-[16px] leading-[1.9] text-gray-700">
            회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 관련
            부서 및 개인정보관리책임자를 지정하고 있습니다.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {['고객서비스 담당 부서', '개인정보관리 책임자'].map((t) => (
              <div key={t} className="rounded-xl border border-gray-100 bg-gray-50 p-5">
                <p className="font-bold text-gray-900">{t}</p>
                <dl className="mt-3 space-y-1.5 text-[15px] text-gray-700">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-gray-500">전화번호</dt>
                    <dd>
                      <a href="tel:02-323-3321" className="font-semibold text-[#F46E65]">
                        02-323-3321
                      </a>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-gray-500">이메일</dt>
                    <dd>
                      <a href="mailto:makeupforl@naver.com" className="font-semibold text-[#F46E65]">
                        makeupforl@naver.com
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-5 text-[16px] leading-[1.9] text-gray-700">
            기타 개인정보 침해에 대한 신고나 상담이 필요한 경우에 아래 기관에 문의 가능합니다.
          </p>
          <ul className="mt-3 space-y-2">
            {[
              ['개인정보침해신고센터', 'privacy.kisa.or.kr', '국번없이 118'],
              ['대검찰청 사이버수사과', 'www.spo.go.kr', '국번없이 1301'],
              ['경찰청 사이버수사국', 'police.go.kr', '국번없이 182'],
            ].map(([name, site, tel]) => (
              <li key={name} className="flex flex-wrap gap-x-2 text-[15px] leading-[1.85] text-gray-700">
                <span className="text-[#F46E65]">·</span>
                <span className="font-semibold text-gray-900">{name}</span>
                <span className="text-gray-500">
                  ({site} / {tel})
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 푸터의 [이메일무단수집거부] 가 여기로 온다 */}
        <section id="email" className="mt-12 scroll-mt-28">
          <h2 className="text-[19px] font-bold text-gray-900 sm:text-[21px]">이메일무단수집거부</h2>
          <p className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-5 text-[16px] leading-[1.9] text-gray-700">
            본 웹사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적 장치를 이용하여
            무단으로 수집되는 것을 거부하며 이를 위반시 정보통신망법에 의해 형사처벌됨을 유념하시기
            바랍니다.
          </p>
        </section>
      </div>
    </div>
  )
}
