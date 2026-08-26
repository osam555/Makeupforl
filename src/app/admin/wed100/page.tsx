'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Save, Eye, RefreshCw, Database, CheckCircle2, XCircle, Volume2, Trash2, Undo2, Archive } from 'lucide-react'

import seedRaw from '@/data/wed100.json'
import { getDb, uploadAudio } from '@/lib/firebase/client'
import AdminGate from '@/components/admin/AdminGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { splitSentences } from '@/lib/wed100-text'
import { photosByCat, allPhotos, type Wed100Photo } from '@/lib/wed100-photos'
import Wed100PhotoUpload from '@/components/admin/Wed100PhotoUpload'
import Wed100McLevel from '@/components/admin/Wed100McLevel'
import type { Wed100Data, Wed100Item } from '@/types/wed100'
import { PART_THEME } from '@/types/wed100'

const seed = seedRaw as unknown as Wed100Data

/** 프롤로그(part 0)·에필로그(part 7)는 번호 대신 이름으로 표시한다 */
function itemLabel(x: { part: number; n: number }): string {
  if (x.part === 0) return '프롤로그'
  if (x.part === 7) return '에필로그'
  return `P${x.part}·${String(x.n).padStart(2, '0')}`
}

/** 외부(스토리지) 주소인지 — next/image 최적화를 건너뛰어 방금 올린 사진도 바로 보이게 한다 */
function isRemote(src?: string | null): boolean {
  return !!src && /^https?:\/\//.test(src)
}

type Status = { kind: 'ok' | 'err'; msg: string } | null

/** 편집 글자 크기 (원장님 가독성용) */
type FontSize = 'sm' | 'md' | 'lg'
const FONT_SIZES: { key: FontSize; label: string; px: number; lh: number }[] = [
  { key: 'sm', label: '작게', px: 13, lh: 1.7 },
  { key: 'md', label: '보통', px: 16, lh: 1.8 },
  { key: 'lg', label: '크게', px: 20, lh: 1.85 },
]
const FONT_KEY = 'wed100AdminFont'

function AdminWed100Editor({
  email,
  password,
  canWrite,
}: {
  email: string | null
  password: string | null
  canWrite: boolean
}) {
  const authed = true

  const [items, setItems] = useState<Wed100Item[]>([])
  const [source, setSource] = useState<'db' | 'seed'>('seed')
  const [sel, setSel] = useState<string>('p1-01')
  const [draft, setDraft] = useState<Wed100Item | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tts, setTts] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const [part, setPart] = useState(-1)
  const [kw, setKw] = useState('')
  const [font, setFont] = useState<FontSize>('md')

  /** 삭제 보관함 */
  type TrashRow = {
    id: string
    slug: string
    part: number
    n: number
    question: string
    deletedAt: string | null
    deletedBy: string | null
    hasAudio: boolean
    cues: number
  }
  const [trash, setTrash] = useState<TrashRow[] | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)

  useEffect(() => {
    const v = window.localStorage.getItem(FONT_KEY)
    if (v === 'sm' || v === 'md' || v === 'lg') setFont(v)
  }, [])
  const chooseFont = (v: FontSize) => {
    window.localStorage.setItem(FONT_KEY, v)
    setFont(v)
  }
  const fs = FONT_SIZES.find((f) => f.key === font) ?? FONT_SIZES[1]
  const editStyle = { fontSize: `${fs.px}px`, lineHeight: fs.lh }
  const cueStyle = { fontSize: `${Math.max(12, fs.px - 2)}px`, lineHeight: fs.lh }

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
          (part === -1 || x.part === part) &&
          (!kw || x.question.includes(kw) || x.slug.includes(kw)),
      ),
    [items, part, kw],
  )

  /** 어드민에서 올린 사진 — 저장소 카탈로그와 합쳐서 고르게 한다 */
  const [toolsOpen, setToolsOpen] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<Wed100Photo[]>([])
  const loadPhotos = useCallback(async () => {
    const db = getDb()
    if (!db) return
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'wed100_photos'))
      setUploadedPhotos(snap.docs.map((d) => d.data() as Wed100Photo))
    } catch {
      /* 사진을 못 읽어도 저장소 카탈로그로는 계속 쓸 수 있다 */
    }
  }, [])
  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  const photoGroups = useMemo(() => photosByCat(uploadedPhotos), [uploadedPhotos])
  const uploadedNames = useMemo(
    () => new Set(uploadedPhotos.map((p) => p.name)),
    [uploadedPhotos],
  )

  /** 사진 고르기 — 분류 탭 · 검색 · 올린 사진만 보기 */
  const [photoCat, setPhotoCat] = useState<string>('all')
  const [photoKw, setPhotoKw] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const visiblePhotos = useMemo(() => {
    const q = photoKw.trim().toLowerCase()
    return allPhotos(uploadedPhotos).filter(
      (p) =>
        (photoCat === 'all' || p.cat === photoCat) &&
        (!onlyMine || uploadedNames.has(p.name)) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          (p.note ?? '').toLowerCase().includes(q) ||
          (p.src ?? '').toLowerCase().includes(q)),
    )
  }, [uploadedPhotos, uploadedNames, photoCat, photoKw, onlyMine])

  /** 고른 사진을 지금 편집 중인 문항의 대표 이미지로 지정한다 */
  const applyPhoto = useCallback((ph: Wed100Photo) => {
    setDraft((d) => {
      if (!d) return d
      return {
        ...d,
        photo: ph.name,
        photoAuto: false,
        heroImage: ph.hero,
        thumbImage: ph.thumb,
      }
    })
    setDirty(true)
  }, [])

  /** 어드민에서 올린 사진 지우기 — 저장소 카탈로그 사진은 코드에 있어서 못 지운다 */
  const removeUploaded = async (name: string) => {
    // 쓰고 있는 문항이 있으면 몇 개인지 먼저 알려 준다
    const inUse = items.filter((x) => x.photo === name)
    const warn = inUse.length
      ? `\n\n지금 ${inUse.length}개 문항이 이 사진을 쓰고 있습니다:\n` +
        inUse.slice(0, 5).map((x) => `  · ${itemLabel(x)} ${x.question}`).join('\n') +
        (inUse.length > 5 ? `\n  · 외 ${inUse.length - 5}개` : '') +
        '\n\n목록에서만 빠지고 이미 지정된 문항의 사진은 그대로 남습니다.'
      : ''
    if (!window.confirm(`${name} 사진을 목록에서 지울까요?${warn}`)) return
    const db = getDb()
    if (!db) return
    try {
      const { doc, deleteDoc } = await import('firebase/firestore')
      await deleteDoc(doc(db, 'wed100_photos', name))
      await loadPhotos()
      setStatus({ kind: 'ok', msg: `${name} 사진을 목록에서 지웠습니다.` })
    } catch (e) {
      setStatus({
        kind: 'err',
        msg: `사진을 지우지 못했습니다 — ${e instanceof Error ? e.message : String(e)}`,
      })
    }
  }

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

  /** 저장 API 인증 정보 — 구글 로그인이면 ID 토큰, 아니면 비밀번호 */
  const authPayload = useCallback(async () => {
    if (email) {
      const { getFirebaseApp } = await import('@/lib/firebase/client')
      const app = getFirebaseApp()
      if (app) {
        const { getAuth } = await import('firebase/auth')
        const token = await getAuth(app).currentUser?.getIdToken()
        if (token) return { idToken: token }
      }
    }
    return { password }
  }, [email, password])

  /** 서버에서 음성을 다시 합성 → Storage 업로드 → 드래프트에 타임코드 반영 */
  const regenAudio = async () => {
    if (!draft) return

    if (!confirm(`"${draft.question}"\n\n현재 자막 ${draft.cues.length}개로 음성을 다시 만듭니다. 1~2분 걸릴 수 있습니다. 계속할까요?`)) return

    setTts(true)
    setStatus(null)
    try {
      const res = await fetch('/api/wed100/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(await authPayload()),
          slug: draft.slug,
          question: draft.question,
          cues: draft.cues.map((c) => c.ko),
        }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)

      let url: string = j.audioUrl ?? ''
      if (!url) {
        // 서버 업로드가 불가한 경우: 로그인한 클라이언트가 직접 업로드
        const bin = Uint8Array.from(atob(j.audioBase64), (ch) => ch.charCodeAt(0))
        url = await uploadAudio(draft.slug, new Blob([bin], { type: 'audio/mpeg' }))
      }

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

  /** 삭제 보관함 열기 */
  const loadTrash = async () => {
    setTrashOpen(true)
    try {
      const res = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await authPayload()), action: 'trash' }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setTrash(j.rows as TrashRow[])
    } catch (e) {
      setTrash([])
      setStatus({ kind: 'err', msg: '보관함 조회 실패: ' + (e instanceof Error ? e.message : String(e)) })
    }
  }

  /** 보관함에서 복구 */
  const restoreItem = async (row: TrashRow) => {
    if (!confirm(`"${row.question}" 문항을 되살립니다.\n\n파트 ${row.part} 의 마지막 번호로 들어갑니다. 계속할까요?`)) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await authPayload()), action: 'restore', id: row.id }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setStatus({ kind: 'ok', msg: `복구했습니다 — P${j.part}·${String(j.n).padStart(2, '0')} ${row.question}` })
      setTrash((t) => (t ?? []).filter((x) => x.id !== row.id))
      void load()
    } catch (e) {
      setStatus({ kind: 'err', msg: '복구 실패: ' + (e instanceof Error ? e.message : String(e)) })
    } finally {
      setSaving(false)
    }
  }

  /** 삭제로 생긴 번호 공백 메우기 — 파트별로 1부터 다시 매긴다 (slug/URL 은 그대로) */
  const renumber = async () => {
    if (
      !confirm(
        '파트별 문항 번호를 1부터 다시 매깁니다.\n\n삭제로 생긴 번호 공백이 사라집니다.\n문항 주소(slug)와 음성 파일은 그대로 유지됩니다. 계속할까요?',
      )
    )
      return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await authPayload()), action: 'renumber' }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setStatus({
        kind: 'ok',
        msg: j.changed
          ? `번호를 다시 매겼습니다 — ${j.changed}개 문항 변경`
          : '번호 공백이 없어 변경할 항목이 없습니다.',
      })
      void load()
    } catch (e) {
      setStatus({ kind: 'err', msg: '번호 재정렬 실패: ' + (e instanceof Error ? e.message : String(e)) })
    } finally {
      setSaving(false)
    }
  }

  /** 문항 삭제 — 슬러그를 직접 입력해 확인받는다 */
  const removeItem = async () => {
    if (!draft) return
    const label = `${itemLabel(draft)} ${draft.question}`
    const typed = window.prompt(
      `이 문항을 삭제합니다.\n\n  ${label}\n\n삭제하려면 아래에 문항 코드 "${draft.slug}" 를 그대로 입력하세요.\n(삭제본은 복구용으로 보관됩니다)`,
    )
    if (typed === null) return
    if (typed.trim() !== draft.slug) {
      setStatus({ kind: 'err', msg: '문항 코드가 일치하지 않아 삭제하지 않았습니다.' })
      return
    }
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await authPayload()), action: 'delete', slug: draft.slug }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      const rest = items.filter((x) => x.slug !== draft.slug)
      setItems(rest)
      setDraft(null)
      setDirty(false)
      setSel(rest[0]?.slug ?? '')
      setStatus({ kind: 'ok', msg: `삭제했습니다 — ${label}` })
    } catch (e) {
      setStatus({ kind: 'err', msg: '삭제 실패: ' + (e instanceof Error ? e.message : String(e)) })
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(await authPayload()),
          action: 'save',
          item: draft,
          baseUpdatedAt: (draft as { updatedAt?: string }).updatedAt ?? null,
        }),
      })
      const j = await res.json()
      if (!j.ok) {
        if (res.status === 409) {
          setStatus({ kind: 'err', msg: j.error })
          return
        }
        throw new Error(j.error)
      }
      ;(draft as { updatedAt?: string }).updatedAt = j.updatedAt
      setItems((arr) => arr.map((x) => (x.slug === draft.slug ? { ...draft } : x)))
      setDirty(false)
      setStatus({
        kind: 'ok',
        msg:
          `저장되었습니다 (${j.editor}). 사이트 새로고침하면 바로 반영됩니다.` +
          (j.cueSync ? ` 본문 수정에 맞춰 자막 ${j.cueSync}줄도 함께 고쳤습니다.` : ''),
      })
    } catch (e) {
      setStatus({ kind: 'err', msg: '저장 실패: ' + (e instanceof Error ? e.message : String(e)) })
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
    try {
      const res = await fetch('/api/wed100/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await authPayload()), action: 'seed', overwrite }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setStatus({ kind: 'ok', msg: `시드 완료: ${j.upserted}건 입력, ${j.skipped}건 유지` })
      void load()
    } catch (e) {
      setStatus({ kind: 'err', msg: '시드 실패: ' + (e instanceof Error ? e.message : String(e)) })
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
          <span className="text-xs text-[#B3A69F]">
            질문 {items.filter((x) => x.part >= 1 && x.part <= 6).length}문
            {items.some((x) => x.part === 0 || x.part === 7) &&
              ` · 프롤로그/에필로그 ${items.filter((x) => x.part === 0 || x.part === 7).length}`}
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={loadTrash}
            >
              <Archive className="mr-1 h-3.5 w-3.5" /> 삭제 보관함
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={renumber}
              disabled={saving || !canWrite}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> 번호 다시 매기기
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => setToolsOpen((v) => !v)}
            >
              <Volume2 className="mr-1 h-3.5 w-3.5" /> 음성 도구
            </Button>
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

        {toolsOpen && (
          <div className="border-x border-[#E0D6CC] bg-white px-5 py-4">
            <Wed100McLevel
              items={items}
              googleEmail={email}
              auth={authPayload}
              onDone={() => void load()}
            />
          </div>
        )}

        {trashOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 p-4 pt-[8vh]"
            onClick={() => setTrashOpen(false)}
          >
            <div
              className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 bg-[#221D1B] px-5 py-3.5 text-white">
                <Archive className="h-4 w-4" />
                <b className="text-sm">삭제 보관함</b>
                <span className="text-xs text-[#B3A69F]">
                  {trash === null ? '불러오는 중…' : `${trash.length}개 보관 중`}
                </span>
                <button
                  onClick={() => setTrashOpen(false)}
                  className="ml-auto text-xs text-[#B3A69F] hover:text-white"
                >
                  닫기 ✕
                </button>
              </div>
              <div className="max-h-[60vh] overflow-auto p-4">
                <p className="mb-3 text-xs leading-relaxed text-[#6B5D57]">
                  삭제한 문항은 내용 그대로 여기에 보관됩니다. [되살리기]를 누르면 본문·자막·음성까지
                  그대로 복구되며, 해당 파트의 <b>마지막 번호</b>로 들어갑니다.
                </p>
                {trash !== null && trash.length === 0 && (
                  <p className="py-10 text-center text-sm text-[#9A8B84]">보관된 문항이 없습니다.</p>
                )}
                <ul className="space-y-2">
                  {(trash ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E7DDD4] px-3.5 py-3"
                    >
                      <span
                        className="min-w-[52px] text-[10px] font-extrabold"
                        style={{ color: PART_THEME[row.part]?.accent ?? '#7A6A5F' }}
                      >
                        P{row.part}·{String(row.n).padStart(2, '0')}
                      </span>
                      <span className="flex-1 text-[13px] leading-snug text-[#2E2724]">
                        {row.question}
                        <span className="mt-0.5 block text-[11px] text-[#9A8B84]">
                          {row.slug} · 자막 {row.cues}줄 · {row.hasAudio ? '음성 있음' : '음성 없음'}
                          {row.deletedAt ? ` · ${row.deletedAt.slice(0, 16).replace('T', ' ')} 삭제` : ''}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving || !canWrite}
                        onClick={() => restoreItem(row)}
                      >
                        <Undo2 className="mr-1.5 h-3.5 w-3.5" /> 되살리기
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
                {[-1, 0, 1, 2, 3, 4, 5, 6, 7].map((v) => (
                  <button
                    key={v}
                    onClick={() => setPart(v)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      part === v
                        ? 'border-[#A63D5A] bg-[#A63D5A] font-bold text-white'
                        : 'border-[#E7DDD4] bg-white text-[#5B4F49]'
                    }`}
                  >
                    {v === -1 ? '전체' : v === 0 ? '프롤로그' : v === 7 ? '에필로그' : `P${v}`}
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
                    className="mt-0.5 min-w-[52px] text-[10px] font-extrabold"
                    style={{ color: PART_THEME[x.part].accent }}
                  >
                    {itemLabel(x)}
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
              <div className="sticky -top-5 z-10 -mx-5 flex flex-wrap items-center gap-2.5 border-b border-[#E7DDD4] bg-white/95 px-5 pb-3 pt-1 backdrop-blur lg:-mx-6 lg:-top-6 lg:px-6">
                <h2 className="text-lg font-extrabold text-[#2E2724]">{itemLabel(draft)} 편집</h2>
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
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={saving || !dirty || !canWrite}
                    className="bg-[#A63D5A] hover:bg-[#8A2E48]"
                  >
                    <Save className="mr-1.5 h-4 w-4" /> {saving ? '저장 중…' : '저장'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={regenAudio} disabled={tts || !canWrite}>
                    <Volume2 className="mr-1.5 h-4 w-4" />
                    {tts ? '음성 만드는 중…' : '음성 재생성'}
                  </Button>
                  <Link href={`/wed100/${draft.slug}`} target="_blank">
                    <Button size="sm" variant="outline">
                      <Eye className="mr-1.5 h-4 w-4" /> 미리보기
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patch((d) => (d.published = d.published === false))}
                  >
                    {draft.published !== false ? '비공개로 전환' : '공개로 전환'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={removeItem}
                    disabled={saving || !canWrite}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> 삭제
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold text-[#6B5D57]">질문 (한국어)</span>
                  <input
                    value={draft.question}
                    onChange={(e) => patch((d) => (d.question = e.target.value))}
                    style={editStyle}
                    className="mt-1.5 w-full rounded-lg border border-[#E7DDD4] px-3 py-2.5 outline-none focus:border-[#A63D5A]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[#6B5D57]">질문 (English)</span>
                  <input
                    value={draft.question_en ?? ''}
                    onChange={(e) => patch((d) => (d.question_en = e.target.value))}
                    style={editStyle}
                    className="mt-1.5 w-full rounded-lg border border-[#E7DDD4] px-3 py-2.5 outline-none focus:border-[#A63D5A]"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#6B5D57]">
                  답변 본문 (문단은 빈 줄로 구분 · 본문 수정 후 [큐 재생성]으로 자막 갱신)
                  <span className="ml-auto flex items-center gap-1.5 font-normal">
                    <span className="text-[11px] text-[#9C8D86]">글자 크기</span>
                    <span className="flex gap-0.5 rounded-full border border-[#E7DDD4] bg-white p-0.5">
                      {FONT_SIZES.map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => chooseFont(f.key)}
                          aria-pressed={font === f.key}
                          className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                            font === f.key
                              ? 'bg-[#A63D5A] font-bold text-white'
                              : 'text-[#6B5D57] hover:bg-[#F6E9ED]'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </span>
                  </span>
                </span>
                <textarea
                  value={draft.answer.join('\n\n')}
                  onChange={(e) =>
                    patch((d) => (d.answer = e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)))
                  }
                  rows={7}
                  style={editStyle}
                  className="mt-1.5 w-full rounded-lg border border-[#E7DDD4] px-3 py-2.5 outline-none focus:border-[#A63D5A]"
                />
              </label>

              {/* 대표 이미지 */}
              <div className="mt-4 rounded-xl border border-[#E7DDD4] bg-[#FCFAF8] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#6B5D57]">대표 이미지</p>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        draft.photoAuto === false
                          ? 'bg-[#A63D5A] text-white'
                          : 'bg-[#EFE7DF] text-[#6B5D57]'
                      }`}
                    >
                      {draft.photoAuto === false ? '직접 지정' : '자동 배정'}
                    </span>
                    {draft.photoAuto === false && (
                      <button
                        onClick={() =>
                          patch((d) => {
                            d.photoAuto = true
                          })
                        }
                        className="flex items-center gap-1 text-[11px] font-bold text-[#A63D5A] hover:underline"
                      >
                        <Undo2 className="h-3 w-3" /> 자동 배정으로
                      </button>
                    )}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-start gap-3.5">
                  <div className="relative aspect-video w-40 overflow-hidden rounded-lg bg-[#eee]">
                    <Image
                      key={draft.heroImage ?? 'hero-default'}
                      src={draft.heroImage ?? `/wed100/img/${draft.slug}-hero.svg`}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                      unoptimized={isRemote(draft.heroImage)}
                    />
                  </div>
                  <div className="relative aspect-square w-20 overflow-hidden rounded-lg bg-[#eee]">
                    <Image
                      key={draft.thumbImage ?? 'thumb-default'}
                      src={draft.thumbImage ?? `/wed100/img/${draft.slug}-thumb.svg`}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized={isRemote(draft.thumbImage)}
                    />
                  </div>
                  <div className="min-w-[200px] flex-1 text-[11px] leading-relaxed text-[#6B5D57]">
                    <p>
                      사진을 고르면 이 문항만 <b>직접 지정</b>으로 바뀌어, 다음에 자동 배정을
                      다시 돌려도 그대로 유지됩니다.
                    </p>
                    <p className="mt-1 font-bold text-[#8A6A48]">
                      현재: {draft.photo ?? (draft.heroImage ? '직접 입력한 주소' : '자동 생성 SVG')}
                    </p>
                    {dirty && (
                      <button
                        onClick={save}
                        disabled={saving || !canWrite}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#A63D5A] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#8A2E48] disabled:opacity-40"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {saving ? '저장 중…' : '지금 저장'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <Wed100PhotoUpload
                    uploaded={uploadedPhotos}
                    googleEmail={email}
                    applyLabel={itemLabel(draft)}
                    onChange={(added) => {
                      // 방금 올린 사진은 Firestore 왕복을 기다리지 않고 바로 목록에 붙인다
                      if (added.length) {
                        setUploadedPhotos((v) => [
                          ...v.filter((p) => !added.some((a) => a.name === p.name)),
                          ...added,
                        ])
                      }
                      void loadPhotos()
                    }}
                    onApply={(ph) => applyPhoto(ph)}
                  />
                </div>

                {/* 사진 고르기 */}
                <div className="mt-3 rounded-xl border border-[#E7DDD4] bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-[#6B5D57]">
                      등록된 사진에서 고르기
                      <span className="ml-1.5 font-normal text-[#9C8D86]">
                        {visiblePhotos.length}장
                      </span>
                    </p>
                    <div className="relative ml-auto">
                      <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[#B3A69F]" />
                      <input
                        value={photoKw}
                        onChange={(e) => setPhotoKw(e.target.value)}
                        placeholder="이름·설명 검색"
                        className="w-44 rounded-lg border border-[#E7DDD4] py-1.5 pl-8 pr-2 text-[11px] outline-none focus:border-[#A63D5A]"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-[#6B5D57]">
                      <input
                        type="checkbox"
                        checked={onlyMine}
                        onChange={(e) => setOnlyMine(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#A63D5A]"
                      />
                      올린 사진만
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      onClick={() => setPhotoCat('all')}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                        photoCat === 'all'
                          ? 'border-[#A63D5A] bg-[#A63D5A] text-white'
                          : 'border-[#E7DDD4] bg-white text-[#5B4F49] hover:border-[#DFD2C7]'
                      }`}
                    >
                      전체
                    </button>
                    {photoGroups.map((g) => (
                      <button
                        key={g.cat}
                        onClick={() => setPhotoCat(g.cat)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                          photoCat === g.cat
                            ? 'border-[#A63D5A] bg-[#A63D5A] text-white'
                            : 'border-[#E7DDD4] bg-white text-[#5B4F49] hover:border-[#DFD2C7]'
                        }`}
                      >
                        {g.label} {g.photos.length}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2.5 max-h-[300px] overflow-auto rounded-lg bg-[#FCFAF8] p-2">
                    {visiblePhotos.length === 0 ? (
                      <p className="py-8 text-center text-[11px] text-[#9A8B84]">
                        조건에 맞는 사진이 없습니다.
                      </p>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-2">
                        {visiblePhotos.map((ph) => {
                          const on = draft.photo === ph.name
                          const mine = uploadedNames.has(ph.name)
                          return (
                            <div key={ph.name} className="group relative">
                              <button
                                title={`${ph.name}${ph.note ? ` — ${ph.note}` : ''}`}
                                onClick={() => applyPhoto(ph)}
                                className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 transition ${
                                  on
                                    ? 'border-[#A63D5A] ring-2 ring-[#A63D5A]/30'
                                    : 'border-transparent hover:border-[#DFD2C7]'
                                }`}
                              >
                                <Image
                                  src={ph.thumb}
                                  alt={ph.name}
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                  unoptimized={mine}
                                />
                                {on && (
                                  <span className="absolute inset-x-0 bottom-0 bg-[#A63D5A] py-0.5 text-center text-[9px] font-extrabold text-white">
                                    선택됨
                                  </span>
                                )}
                                {!on && mine && (
                                  <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 py-px text-[9px] font-extrabold text-white">
                                    NEW
                                  </span>
                                )}
                              </button>
                              <p className="mt-0.5 truncate text-center text-[9px] text-[#9C8D86]">
                                {ph.name}
                              </p>
                              {mine && (
                                <button
                                  onClick={() => void removeUploaded(ph.name)}
                                  title={`${ph.name} 지우기`}
                                  aria-label={`${ph.name} 지우기`}
                                  className="absolute -right-1 -top-1 hidden h-5 w-5 place-items-center rounded-full bg-[#C0392B] text-white shadow group-hover:grid"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 직접 URL 입력 (외부 이미지·Storage 업로드본) */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] font-bold text-[#8A7C74]">
                    이미지 주소 직접 입력 · 기본 이미지로 되돌리기
                  </summary>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input
                      value={draft.heroImage ?? ''}
                      onChange={(e) =>
                        patch((d) => {
                          d.heroImage = e.target.value || undefined
                          d.photoAuto = false
                          d.photo = undefined
                        })
                      }
                      placeholder={`hero — ${`/wed100/img/${draft.slug}-hero.svg`} (기본)`}
                      className="w-full rounded-lg border border-[#E7DDD4] bg-white px-3 py-2 text-xs outline-none focus:border-[#A63D5A]"
                    />
                    <input
                      value={draft.thumbImage ?? ''}
                      onChange={(e) =>
                        patch((d) => {
                          d.thumbImage = e.target.value || undefined
                          d.photoAuto = false
                          d.photo = undefined
                        })
                      }
                      placeholder={`thumb — ${`/wed100/img/${draft.slug}-thumb.svg`} (기본)`}
                      className="w-full rounded-lg border border-[#E7DDD4] bg-white px-3 py-2 text-xs outline-none focus:border-[#A63D5A]"
                    />
                  </div>
                  <button
                    onClick={() =>
                      patch((d) => {
                        d.heroImage = undefined
                        d.thumbImage = undefined
                        d.photo = undefined
                        d.photoAuto = true
                      })
                    }
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E7DDD4] bg-white px-3 py-1.5 text-[11px] font-bold text-[#6B5D57] hover:border-[#DFD2C7]"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> 기본 SVG 이미지로 되돌리기
                  </button>
                  <p className="mt-1.5 text-[11px] text-[#8A7C74]">
                    비우면 자동 생성 SVG로 돌아갑니다. 스크립트로 사진을 늘리려면 photos 폴더에 넣고
                    <code className="mx-1 rounded bg-[#F2EAE3] px-1">4_build_photos.py</code>
                    →
                    <code className="mx-1 rounded bg-[#F2EAE3] px-1">5_assign_photos.py</code>
                    를 실행하세요.
                  </p>
                </details>
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
                          style={cueStyle}
                          className="rounded-md border border-transparent px-2 py-1 outline-none hover:border-[#E7DDD4] focus:border-[#A63D5A]"
                        />
                        <textarea
                          value={c.en ?? ''}
                          onChange={(e) => patch((d) => (d.cues[i] = { ...d.cues[i], en: e.target.value }))}
                          rows={2}
                          style={cueStyle}
                          className="rounded-md border border-transparent px-2 py-1 outline-none hover:border-[#E7DDD4] focus:border-[#A63D5A]"
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
                  자막·본문을 고친 뒤 위쪽 <b>[음성 재생성]</b>을 누르면 이 문항의 음성과 자막
                  타임코드가 다시 만들어집니다. (진행자 여성 · 원장님 1.25배속)
                </p>
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
      {({ email, password, canWrite }) => (
        <AdminWed100Editor email={email} password={password} canWrite={canWrite} />
      )}
    </AdminGate>
  )
}
