'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Save, Eye, RefreshCw, Database, CheckCircle2, XCircle, Volume2 } from 'lucide-react'

import seedRaw from '@/data/wed100.json'
import { getDb, uploadAudio } from '@/lib/firebase/client'
import AdminGate from '@/components/admin/AdminGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Wed100Data, Wed100Item } from '@/types/wed100'
import { PART_THEME } from '@/types/wed100'

const seed = seedRaw as unknown as Wed100Data

/** 한국어 문장 분리 (파서 스크립트와 동일 규칙) */
function splitSentences(text: string, maxLen = 90): string[] {
  const raw = text
    .split(/(?<=[.!?…])\s+|(?<=[.!?…]["”’])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const s of raw) {
    if (s.length <= maxLen) {
      out.push(s)
      continue
    }
    let buf = ''
    for (const piece of s.split(/(?<=,)\s*/)) {
      if (buf.length + piece.length <= maxLen || buf.length < 20) buf += piece
      else {
        out.push(buf.trim())
        buf = piece
      }
    }
    if (buf.trim()) out.push(buf.trim())
  }
  return out
}

type Status = { kind: 'ok' | 'err'; msg: string } | null

function AdminWed100Editor({ email }: { email: string | null }) {
  const authed = true

  const [items, setItems] = useState<Wed100Item[]>([])
  const [source, setSource] = useState<'db' | 'seed'>('seed')
  const [sel, setSel] = useState<string>('p1-01')
  const [draft, setDraft] = useState<Wed100Item | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tts, setTts] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const [part, setPart] = useState(0)
  const [kw, setKw] = useState('')

  const load = useCallback(async () => {
    try {
      const db = getDb()
      if (db) {
        const { collection, getDocs } = await import('firebase/firestore')
        const snap = await getDocs(collection(db, 'wed100_questions'))
        if (!snap.empty) {
          const arr = snap.docs.map((d) => d.data() as Wed100Item)
          arr.sort((a, b) => a.part - b.part || a.n - b.n)
          setItems(arr)
          setSource('db')
          return
        }
      }
    } catch {
      /* firebase 미설정 */
    }
    setItems(seed.items)
    setSource('seed')
  }, [])

  useEffect(() => {
    if (authed) void load()
  }, [authed, load])

  useEffect(() => {
    const it = items.find((x) => x.slug === sel)
    if (it) {
      setDraft(JSON.parse(JSON.stringify(it)) as Wed100Item)
      setDirty(false)
      setStatus(null)
    }
  }, [sel, items])

  const rows = useMemo(
    () =>
      items.filter(
        (x) =>
          (!part || x.part === part) &&
          (!kw || x.question.includes(kw) || x.slug.includes(kw)),
      ),
    [items, part, kw],
  )

  const patch = (fn: (d: Wed100Item) => void) => {
    setDraft((d) => {
      if (!d) return d
      const nd = { ...d }
      fn(nd)
      return nd
    })
    setDirty(true)
  }

  const resplitCues = () => {
    if (!draft) return
    if (
      !confirm(
        '답변 본문에서 자막 큐를 다시 만듭니다.\n기존 큐의 영문 자막·타임코드는 초기화되며, TTS 재생성이 필요해집니다. 계속할까요?',
      )
    )
      return
    patch((d) => {
      const sents = d.answer.flatMap((p) => splitSentences(p))
      d.cues = sents.map((ko, i) => ({ i, ko }))
      d.audio = undefined
      d.duration = undefined
      d.questionAudio = undefined
    })
  }

  /** 서버에서 음성을 다시 합성 → Storage 업로드 → 드래프트에 타임코드 반영 */
  const regenAudio = async () => {
    if (!draft) return
    if (!email) {
      setStatus({ kind: 'err', msg: '관리자 로그인이 필요합니다.' })
      return
    }
    if (!confirm(`"${draft.question}"\n\n현재 자막 ${draft.cues.length}개로 음성을 다시 만듭니다. 1~2분 걸릴 수 있습니다. 계속할까요?`)) return

    setTts(true)
    setStatus(null)
    try {
      const res = await fetch('/api/wed100/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, question: draft.question, cues: draft.cues.map((c) => c.ko) }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)

      const bin = Uint8Array.from(atob(j.audioBase64), (ch) => ch.charCodeAt(0))
      const url = await uploadAudio(draft.slug, new Blob([bin], { type: 'audio/mpeg' }))

      patch((d) => {
        d.audio = url
        d.duration = j.duration
        d.questionAudio = j.questionAudio
        d.cues = d.cues.map((c, i) => ({ ...c, start: j.cues[i]?.start, end: j.cues[i]?.end }))
      })
      setStatus({
        kind: 'ok',
        msg: `음성 재생성 완료 (${Math.round(j.duration)}초). [저장]을 눌러야 사이트에 반영됩니다.`,
      })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setTts(false)
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setStatus(null)
    try {
      const db = getDb()
      if (!db) throw new Error('Firebase 환경변수가 설정되지 않았습니다')
      const { doc, setDoc } = await import('firebase/firestore')
      const row = {
        id: draft.id,
        slug: draft.slug,
        part: draft.part,
        partTitle: draft.partTitle,
        n: draft.n,
        question: draft.question,
        question_en: draft.question_en ?? null,
        answer: draft.answer,
        cues: draft.cues.map((c, i) => ({
          i,
          ko: c.ko,
          en: c.en ?? null,
          start: c.start ?? null,
          end: c.end ?? null,
        })),
        keywords: draft.keywords,
        questionAudio: draft.questionAudio ?? null,
        audio: draft.audio ?? null,
        duration: draft.duration ?? null,
        heroImage: draft.heroImage ?? null,
        thumbImage: draft.thumbImage ?? null,
        published: draft.published ?? true,
        updatedAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'wed100_questions', draft.slug), row)
      setItems((arr) => arr.map((x) => (x.slug === draft.slug ? { ...draft } : x)))
      setDirty(false)
      setStatus({ kind: 'ok', msg: '저장되었습니다. 사이트에는 최대 1시간 내(재검증 주기) 반영됩니다.' })
    } catch (e) {
      setStatus({
        kind: 'err',
        msg:
          'DB 저장 실패: ' +
          (e instanceof Error ? e.message : String(e)) +
          ' — Firebase 프로젝트 세팅(FIREBASE_SETUP.md) 후 [DB에 시드 넣기]를 먼저 눌러주세요.',
      })
    } finally {
      setSaving(false)
    }
  }

  const seedDb = async (overwrite: boolean) => {
    if (
      overwrite &&
      !confirm('DB의 모든 문항을 리포 시드 JSON으로 덮어씁니다. 어드민에서 수정한 내용이 사라집니다. 계속할까요?')
    )
      return
    setStatus(null)
    const res = await fetch('/api/wed100/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, overwrite }),
    })
    const j = await res.json()
    if (j.ok) {
      setStatus({ kind: 'ok', msg: `시드 완료: ${j.upserted}건 입력, ${j.skipped ?? 0}건 유지` })
      void load()
    } else {
      setStatus({ kind: 'err', msg: '시드 실패: ' + j.error })
    }
  }


  return (
    <div className="bg-[#EFE9E3] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* 상단 바 */}
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl bg-[#221D1B] px-5 py-3.5 text-white">
          <b className="text-sm">100문100답 콘텐츠 관리</b>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              source === 'db' ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-800 text-amber-100'
            }`}
          >
            {source === 'db' ? 'DB 연결됨' : '시드 JSON (읽기전용 폴백)'}
          </span>
          <span className="text-xs text-[#B3A69F]">{items.length}문</span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => seedDb(false)}
            >
              <Database className="mr-1 h-3.5 w-3.5" /> DB에 시드 넣기
            </Button>
            <Link href="/admin/dashboard" className="self-center text-xs text-[#B3A69F] hover:text-white">통계 →</Link>
            <Link href="/admin" className="self-center text-xs text-[#B3A69F] hover:text-white">
              예약관리 →
            </Link>
          </div>
        </div>

        {status && (
          <div
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-medium ${
              status.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
            }`}
          >
            {status.kind === 'ok' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {status.msg}
          </div>
        )}

        <div className="grid min-h-[640px] grid-cols-1 overflow-hidden rounded-b-2xl bg-white shadow lg:grid-cols-[300px_1fr]">
          {/* 좌측 리스트 */}
          <div className="flex flex-col border-r border-[#E7DDD4] bg-[#FCFAF8]">
            <div className="p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#B3A69F]" />
                <input
                  value={kw}
                  onChange={(e) => setKw(e.target.value)}
                  placeholder="질문 검색 / slug"
                  className="w-full rounded-lg border border-[#E7DDD4] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-[#A63D5A]"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                  <button
                    key={v}
                    onClick={() => setPart(v)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      part === v
                        ? 'border-[#A63D5A] bg-[#A63D5A] font-bold text-white'
                        : 'border-[#E7DDD4] bg-white text-[#5B4F49]'
                    }`}
                  >
                    {v === 0 ? '전체' : `P${v}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[600px] flex-1 overflow-auto">
              {rows.map((x) => (
                <button
                  key={x.slug}
                  onClick={() => {
                    if (dirty && !confirm('저장하지 않은 변경이 있습니다. 이동할까요?')) return
                    setSel(x.slug)
                  }}
                  className={`flex w-full items-start gap-2.5 border-b border-[#F2EAE3] px-3.5 py-2.5 text-left text-[13px] leading-snug hover:bg-[#F7F0EA] ${
                    x.slug === sel ? 'border-l-[3px] border-l-[#A63D5A] bg-[#F6E9ED]' : ''
                  }`}
                >
                  <span
                    className="mt-0.5 min-w-[42px] text-[10px] font-extrabold"
                    style={{ color: PART_THEME[x.part].accent }}
                  >
                    P{x.part}·{String(x.n).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[#2E2724]">{x.question}</span>
                  <span className="mt-1 flex gap-1">
                    <i
                      className={`h-1.5 w-1.5 rounded-full ${x.audio ? 'bg-emerald-600' : 'bg-[#DCD2CB]'}`}
                      title={x.audio ? '음성 있음' : '음성 없음'}
                    />
                    <i
                      className={`h-1.5 w-1.5 rounded-full ${
                        x.published !== false ? 'bg-emerald-600' : 'bg-red-400'
                      }`}
                      title={x.published !== false ? '공개' : '비공개'}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 우측 편집 */}
          {draft && (
            <div className="max-h-[720px] overflow-auto p-5 lg:p-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-extrabold text-[#2E2724]">
                  P{draft.part} · {String(draft.n).padStart(2, '0')} 편집
                </h2>
                <span className="rounded bg-[#EFE7E1] px-2 py-0.5 text-[10px] font-bold text-[#6B5D57]">
                  {draft.slug}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    draft.published !== false
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {draft.published !== false ? '공개중' : '비공개'}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    draft.audio ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {draft.audio ? `음성 ${Math.round(draft.duration ?? 0)}초` : '음성 미생성'}
                </span>
                {dirty && (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    수정됨 · 저장 필요
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-[#6B5D57]">질문 (한국어)</span>
                  <input
                    value={draft.question}
                    onChange={(e) => patch((d) => (d.question = e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-[#E7DDD4] px-3 py-2.5 text-sm outline-none focus:border-[#A63D5A]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[#6B5D57]">질문 (English)</span>
                  <input
                    value={draft.question_en ?? ''}
                    onChange={(e) => patch((d) => (d.question_en = e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-[#E7DDD4] px-3 py-2.5 text-sm outline-none focus:border-[#A63D5A]"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-bold text-[#6B5D57]">
                  답변 본문 (문단은 빈 줄로 구분 · 본문 수정 후 아래 [큐 재생성]으로 자막 갱신)
                </span>
                <textarea
                  value={draft.answer.join('\n\n')}
                  onChange={(e) =>
                    patch((d) => (d.answer = e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)))
                  }
                  rows={7}
                  className="mt-1.5 w-full rounded-lg border border-[#E7DDD4] px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-[#A63D5A]"
                />
              </label>

              {/* 이미지 */}
              <div className="mt-4 rounded-xl border border-[#E7DDD4] bg-[#FCFAF8] p-3.5">
                <p className="text-xs font-bold text-[#6B5D57]">대표 이미지</p>
                <div className="mt-2 flex flex-wrap items-center gap-3.5">
                  <div className="relative aspect-video w-36 overflow-hidden rounded-lg bg-[#eee]">
                    <Image
                      src={draft.heroImage ?? `/wed100/img/${draft.slug}-hero.svg`}
                      alt=""
                      fill
                      sizes="144px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 text-xs leading-relaxed text-[#6B5D57]">
                    기본값은 자동 생성 SVG입니다. 사진으로 바꾸려면 이미지 URL을 입력하세요
                    (Firebase Storage 업로드 후 URL 붙여넣기). 비우면 SVG로 돌아갑니다.
                    <input
                      value={draft.heroImage ?? ''}
                      onChange={(e) => patch((d) => (d.heroImage = e.target.value || undefined))}
                      placeholder={`/wed100/img/${draft.slug}-hero.svg (기본)`}
                      className="mt-2 w-full rounded-lg border border-[#E7DDD4] bg-white px-3 py-2 text-xs outline-none focus:border-[#A63D5A]"
                    />
                  </div>
                </div>
              </div>

              {/* 자막 큐 */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#6B5D57]">
                    자막 큐 {draft.cues.length}개 (한국어 / English)
                  </span>
                  <button
                    onClick={resplitCues}
                    className="flex items-center gap-1 text-xs font-bold text-[#A63D5A] hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" /> 본문에서 큐 재생성
                  </button>
                </div>
                <div className="mt-2 overflow-hidden rounded-xl border border-[#E7DDD4]">
                  <div className="grid grid-cols-[34px_1fr_1fr_56px] gap-2.5 bg-[#F7F1EC] px-3 py-2 text-[11px] font-extrabold text-[#6B5D57]">
                    <span>#</span><span>한국어</span><span>English</span><span>시작</span>
                  </div>
                  <div className="max-h-[300px] overflow-auto">
                    {draft.cues.map((c, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[34px_1fr_1fr_56px] items-start gap-2.5 border-t border-[#F2EAE3] px-3 py-2"
                      >
                        <span className="pt-1.5 text-[10px] font-extrabold text-[#C0A16B]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <textarea
                          value={c.ko}
                          onChange={(e) => patch((d) => (d.cues[i] = { ...d.cues[i], ko: e.target.value }))}
                          rows={2}
                          className="rounded-md border border-transparent px-2 py-1 text-[12.5px] leading-relaxed outline-none hover:border-[#E7DDD4] focus:border-[#A63D5A]"
                        />
                        <textarea
                          value={c.en ?? ''}
                          onChange={(e) => patch((d) => (d.cues[i] = { ...d.cues[i], en: e.target.value }))}
                          rows={2}
                          className="rounded-md border border-transparent px-2 py-1 text-[12.5px] leading-relaxed outline-none hover:border-[#E7DDD4] focus:border-[#A63D5A]"
                        />
                        <span className="pt-1.5 font-mono text-[10px] text-[#A3948C]">
                          {typeof c.start === 'number'
                            ? `${Math.floor(c.start / 60)}:${String(Math.floor(c.start % 60)).padStart(2, '0')}`
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#9C8D86]">
                  자막·본문을 고친 뒤 아래 <b>[음성 재생성]</b>을 누르면 이 문항의 음성과 자막
                  타임코드가 다시 만들어집니다. (진행자 여성 · 원장님 1.25배속)
                </p>
              </div>

              {/* 액션 */}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#E7DDD4] pt-4">
                <Button
                  onClick={save}
                  disabled={saving || !dirty}
                  className="bg-[#A63D5A] hover:bg-[#8A2E48]"
                >
                  <Save className="mr-1.5 h-4 w-4" /> {saving ? '저장 중…' : '저장'}
                </Button>
                <Button variant="outline" onClick={regenAudio} disabled={tts}>
                  <Volume2 className="mr-1.5 h-4 w-4" />
                  {tts ? '음성 만드는 중…' : '음성 재생성'}
                </Button>
                <Link href={`/wed100/${draft.slug}`} target="_blank">
                  <Button variant="outline">
                    <Eye className="mr-1.5 h-4 w-4" /> 미리보기
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => patch((d) => (d.published = d.published === false))}
                >
                  {draft.published !== false ? '비공개로 전환' : '공개로 전환'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminWed100Page() {
  return (
    <AdminGate title="100문100답 관리">
      {({ email }) => <AdminWed100Editor email={email} />}
    </AdminGate>
  )
}
