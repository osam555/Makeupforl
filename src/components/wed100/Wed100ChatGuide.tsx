'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { MEMBER_CREDIT_NOTE } from '@/lib/wed100Access'

/**
 * 말풍선으로 묻고 답하며 100문100답으로 데려가고, 상담 신청까지 받는 안내.
 *
 * 광고 랜딩(star-event.net, 2026-10-30 분석)의 "말풍선 문답 → 연락처" 형식을 빌렸다.
 * 그쪽처럼 "오늘 자정까지만" 같은 마감 문구는 넣지 않는다 — 원장님 말투가 아니고
 * 매달 저절로 갱신되는 마감은 표시광고법에 걸린다. 연락처는 동의를 받고 /api/consult-lead
 * 로만 보낸다(방문 통계와 섞지 않는다).
 *
 * 한 번에 질문 하나, 탭 한 번. 50~60대 손님이 키보드를 꺼내는 건 이름·번호 칸뿐이다.
 */

export type ChatGuidePart = {
  part: number
  count: number
  free?: { slug: string; question: string }
}

const WHO = ['신랑 어머님이에요', '신부 어머님이에요', '그냥 둘러보는 중이에요']
const WHEN = ['한 달 안', '1~3개월', '3개월 넘게', '아직 미정']

/* 걱정 → 그 걱정을 다룬 파트. 파트 제목을 그대로 보이면 손님 말이 아니라 목차 말이 된다 */
const WORRY = [
  { label: '어디서 받아야 할지 모르겠어요', part: 1, reply: '업체 고르는 법과 예약 시기부터 정리해 드렸어요.' },
  { label: '미리 뭘 준비해야 하죠?', part: 2, reply: '사전 컨설팅에서 무엇을 보는지, 집에서 할 일까지 담았어요.' },
  { label: '주름·처진 눈이 신경 쓰여요', part: 3, reply: '중년 피부에 맞는 혼주 화장은 젊을 때 화장과 다릅니다.' },
  { label: '올림머리·정수리 숱이 걱정이에요', part: 4, reply: '숱이 적어도 단정한 올림머리가 됩니다. 방법을 하나씩 말씀드렸어요.' },
  { label: '한복 색을 못 고르겠어요', part: 5, reply: '퍼스널 컬러로 어울리는 색과 피해야 할 색을 알려 드려요.' },
  { label: '결혼식 당일이 막막해요', part: 6, reply: '도착 시간부터 폐백까지 당일 순서를 그대로 따라가요.' },
]

type Msg = { from: 'me' | 'you'; text: string }
type Step = 'who' | 'worry' | 'offer' | 'form' | 'sent'

export default function Wed100ChatGuide({
  parts,
  totalCount,
  totalMinutes,
  storeUrl,
  priceLabel,
  months,
}: {
  parts: ChatGuidePart[]
  totalCount: number
  totalMinutes: number
  storeUrl: string
  priceLabel: string
  months: number
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [step, setStep] = useState<Step>('who')
  const [typing, setTyping] = useState(true)
  const [who, setWho] = useState('')
  const [worry, setWorry] = useState<(typeof WORRY)[number] | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', when: '', agree: false, website: '' })
  const [err, setErr] = useState('')
  const [sending, setSending] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])

  // 원장님 쪽 말은 잠깐 "입력 중" 을 보인 뒤 나온다 — 바로 뜨면 안내문, 쉬었다 뜨면 대화로 읽힌다
  function say(lines: string[], then?: Step) {
    setTyping(true)
    lines.forEach((text, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setMsgs((m) => [...m, { from: 'me', text }])
          if (i === lines.length - 1) {
            setTyping(false)
            if (then) setStep(then)
          }
        }, 700 * (i + 1)),
      )
    })
  }
  const answer = (text: string) => setMsgs((m) => [...m, { from: 'you', text }])

  useEffect(() => {
    say(['안녕하세요, 메이크업포엘 원장 김성희입니다.', '자녀 결혼 준비 중이세요?'])
    const t = timers.current
    return () => t.forEach(clearTimeout)
  }, []) // 첫 인사는 한 번만

  // 대화가 길어지면 상자 안에서만 내린다 — 페이지 전체를 끌어내리면 손님이 보던 자리를 잃는다
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing, step])

  function pickWho(t: string) {
    answer(t)
    setWho(t)
    say([t.startsWith('그냥') ? '천천히 보세요.' : '축하드려요. 준비할 게 많으시죠.', '지금 가장 걱정되는 게 뭐예요?'], 'worry')
  }

  function pickWorry(w: (typeof WORRY)[number]) {
    answer(w.label)
    setWorry(w)
    const p = parts.find((x) => x.part === w.part)
    say(
      [
        w.reply,
        `25년 동안 혼주님들이 가장 많이 물으신 ${totalCount}가지를 제 목소리로 답한 「100문 100답」 중 ${p?.count ?? 0}개가 이 이야기예요.`,
        p?.free ? '그중 하나는 무료로 열어 두었어요. 먼저 들어 보세요.' : '무료로 열어 둔 문항부터 들어 보셔도 좋아요.',
        '얼굴을 직접 보고 말씀드려야 할 부분은 제가 따로 연락드릴 수도 있어요.',
      ],
      'offer',
    )
  }

  function wantCall() {
    answer('연락 받고 싶어요')
    say(['성함과 휴대전화 번호, 결혼식 시기를 남겨 주세요.', '제가 확인하고 직접 연락드릴게요.'], 'form')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!form.name.trim() || !form.phone.trim() || !form.when) return setErr('성함·휴대전화·시기를 모두 적어 주세요.')
    if (!form.agree) return setErr('개인정보 수집·이용에 동의해 주셔야 연락드릴 수 있어요.')
    setSending(true)
    try {
      const r = await fetch('/api/consult-lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, who, worry: worry?.label ?? '' }),
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string }
      if (!r.ok) return setErr(j.error ?? '접수하지 못했어요. 02-323-3321 로 전화 주세요.')
      answer(`${form.name.trim()} · ${form.phone.trim()} · ${form.when}`)
      say([`${form.name.trim()}님, 잘 받았어요.`, '영업시간 안에 제가 직접 전화드릴게요. 그 전에 100문 100답을 먼저 들어 보셔도 좋아요.'], 'sent')
    } catch {
      setErr('접수하지 못했어요. 02-323-3321 로 전화 주세요.')
    } finally {
      setSending(false)
    }
  }

  const part = worry ? parts.find((x) => x.part === worry.part) : undefined
  const showPitch = !typing && (step === 'offer' || step === 'form' || step === 'sent')

  return (
    <section aria-label="원장님께 물어보기" className="rounded-3xl border border-[var(--w-line)] bg-[var(--w-card)] p-5 sm:p-7">
      <p className="text-[13px] font-extrabold tracking-[0.2em] text-[var(--w-rose)]">원장님께 물어보기</p>

      <div ref={box} className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`w-chat-in max-w-[85%] rounded-2xl px-4 py-3 text-[17px] leading-relaxed ${
                m.from === 'you' ? 'rounded-br-sm bg-[var(--w-rose)] text-white' : 'rounded-bl-sm bg-[var(--w-bg)] text-[var(--w-ink)]'
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start" aria-label="입력 중">
            <span className="flex gap-1 rounded-2xl rounded-bl-sm bg-[var(--w-bg)] px-4 py-4">
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-chat-dot h-2 w-2 rounded-full bg-[var(--w-mut)]" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      {!typing && step === 'who' && (
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {WHO.map((t) => (
            <button key={t} type="button" onClick={() => pickWho(t)} className={choice}>
              {t}
            </button>
          ))}
        </div>
      )}

      {!typing && step === 'worry' && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {WORRY.map((w) => (
            <button key={w.part} type="button" onClick={() => pickWorry(w)} className={choice}>
              {w.label}
            </button>
          ))}
        </div>
      )}

      {showPitch && (
        <div className="mt-5 space-y-3">
          {part?.free && (
            <Link
              href={`/honjoo100/${part.free.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-[var(--w-rose)] p-4 transition hover:bg-[var(--w-bg)]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--w-rose)] text-white">▶</span>
              <span className="min-w-0">
                <span className="block text-[12px] font-extrabold tracking-wider text-[var(--w-rose)]">무료 · 로그인 없이</span>
                <span className="block text-[16px] font-bold text-[var(--w-ink)]">{part.free.question}</span>
              </span>
            </Link>
          )}
          <div className="rounded-2xl bg-[var(--w-bg)] p-4">
            <p className="text-[15px] text-[var(--w-ink2)]">
              전체 {totalCount}문항 · 음성 {totalMinutes}분 · {months}개월 동안 몇 번이고 다시 듣기
            </p>
            <p className="mt-1 text-[15px] font-bold text-[var(--w-rose)]">{MEMBER_CREDIT_NOTE}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {storeUrl ? (
                <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={cta}>
                  전체 듣기 {priceLabel}
                </a>
              ) : (
                <a href="tel:02-323-3321" className={cta}>
                  이용권 신청 · 02-323-3321
                </a>
              )}
              {step === 'offer' && (
                <button type="button" onClick={wantCall} className={ghost}>
                  원장님 연락 받기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!typing && step === 'form' && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border border-[var(--w-line)] p-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={lbl}>성함</span>
              <input
                className={inp}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name"
                maxLength={30}
              />
            </label>
            <label className="block">
              <span className={lbl}>휴대전화</span>
              <input
                className={inp}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                inputMode="tel"
                autoComplete="tel"
                placeholder="010-0000-0000"
                maxLength={13}
              />
            </label>
          </div>
          <div>
            <span className={lbl}>결혼식 시기</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {WHEN.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setForm({ ...form, when: w })}
                  aria-pressed={form.when === w}
                  className={`min-h-[44px] rounded-full border px-4 text-[15px] font-bold transition ${
                    form.when === w
                      ? 'border-[var(--w-rose)] bg-[var(--w-rose)] text-white'
                      : 'border-[var(--w-line)] text-[var(--w-ink)] hover:border-[var(--w-rose)]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          {/* 사람 눈에는 안 보이는 칸. 봇만 채운다 */}
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            name="website"
          />
          {/* 개인정보보호법 제15조 — 항목·목적·보관 기간·거부 권리를 동의 전에 알린다 */}
          <div className="rounded-xl bg-[var(--w-bg)] p-3 text-[13px] leading-relaxed text-[var(--w-ink2)]">
            <p className="font-bold text-[var(--w-ink)]">개인정보 수집·이용 안내</p>
            <p>수집 항목: 성함, 휴대전화 번호, 결혼식 시기, 선택하신 상담 내용</p>
            <p>이용 목적: 상담 연락 · 보관 기간: 접수일로부터 1년 (요청 시 즉시 파기)</p>
            <p>동의하지 않으셔도 되며, 이 경우 전화(02-323-3321)나 카카오톡으로 상담하실 수 있어요.</p>
          </div>
          <label className="flex min-h-[44px] items-center gap-3 text-[15px] font-bold text-[var(--w-ink)]">
            <input
              type="checkbox"
              checked={form.agree}
              onChange={(e) => setForm({ ...form, agree: e.target.checked })}
              className="h-5 w-5 accent-[var(--w-rose)]"
            />
            개인정보 수집·이용에 동의합니다 (필수)
          </label>
          {err && <p role="alert" className="text-[14px] font-semibold text-[var(--w-rose)]">{err}</p>}
          <button type="submit" disabled={sending} className={`${cta} w-full justify-center disabled:opacity-60`}>
            {sending ? '보내는 중…' : '원장님께 연락 요청'}
          </button>
        </form>
      )}

      <style>{`
        .w-chat-in { animation: w-chat-in 400ms ease-out }
        .w-chat-dot { animation: w-chat-dot 1s infinite }
        @keyframes w-chat-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes w-chat-dot { 0%, 60%, 100% { opacity: .3 } 30% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .w-chat-in, .w-chat-dot { animation: none } }
      `}</style>
    </section>
  )
}

// 손님 쪽 단추·칸 — 48px 넘는 높이, 16px 넘는 글자. 중년 손님 손가락·눈 기준
const choice =
  'min-h-[48px] rounded-full border border-[var(--w-rose)] bg-[var(--w-card)] px-5 py-2.5 text-left text-[16px] font-bold text-[var(--w-rose)] transition hover:bg-[var(--w-rose)] hover:text-white'
const cta =
  'inline-flex min-h-[48px] items-center rounded-full bg-[var(--w-rose)] px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90'
const ghost =
  'inline-flex min-h-[48px] items-center rounded-full border border-[var(--w-rose)] px-6 text-[15px] font-bold text-[var(--w-rose)] transition-colors hover:bg-[var(--w-rose)] hover:text-white'
const lbl = 'block text-[13px] font-bold text-[var(--w-mut)]'
const inp =
  'mt-1 block min-h-[48px] w-full rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] px-4 text-[17px] text-[var(--w-ink)] outline-none focus:border-[var(--w-rose)]'
