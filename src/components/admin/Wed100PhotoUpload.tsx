'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, X, Loader2, Crosshair, Trash2, CheckCircle2, ImagePlus } from 'lucide-react'

import { getDb, uploadWed100Photo } from '@/lib/firebase/client'
import { makeHero, makeThumb } from '@/lib/wed100-photo-build'
import {
  PHOTO_CATS,
  PHOTO_CAT_LABEL,
  nextPhotoName,
  type Wed100Photo,
} from '@/lib/wed100-photos'

/** 올리기 전 대기 중인 사진 한 장 */
interface Pending {
  id: string
  file: File
  url: string
  bitmap: ImageBitmap
  cat: string
  note: string
  /** 크롭 기준점 (0~1) */
  fx: number
  fy: number
  state: 'ready' | 'busy' | 'done' | 'error'
  message?: string
}

let seq = 0

/**
 * EXIF 회전을 반영해 비트맵을 만든다.
 * 옵션 없이 부르면 아이폰 사진이 미리보기와 다르게 눕는다 —
 * <img> 는 EXIF 를 따르지만 createImageBitmap 의 기본값은 무시하기 때문이다.
 */
async function readBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return createImageBitmap(file)
  }
}

export default function Wed100PhotoUpload({
  uploaded,
  googleEmail,
  onChange,
  onApply,
  applyLabel,
}: {
  uploaded: Wed100Photo[]
  /** 구글 관리자 계정 — 비밀번호 로그인이면 null */
  googleEmail: string | null
  /** 카탈로그가 바뀌었다 — 부모가 목록을 다시 읽는다 */
  onChange: (added: Wed100Photo[]) => void
  /** 올린 사진을 지금 편집 중인 문항에 바로 지정한다 */
  onApply?: (photo: Wed100Photo) => void
  /** 적용 대상 문항 이름 (체크박스 설명용) */
  applyLabel?: string
}) {
  const [rows, setRows] = useState<Pending[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [applyNow, setApplyNow] = useState(true)
  const [doneMsg, setDoneMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  // 미리보기 URL 정리 — 최신 rows 를 언마운트 시점에 정확히 비운다
  const rowsRef = useRef<Pending[]>([])
  rowsRef.current = rows
  useEffect(() => {
    return () => rowsRef.current.forEach((r) => URL.revokeObjectURL(r.url))
  }, [])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setErr('')
    setDoneMsg('')
    const next: Pending[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const bitmap = await readBitmap(file)
        next.push({
          id: `p${++seq}`,
          file,
          url: URL.createObjectURL(file),
          bitmap,
          // 세로 사진은 대개 인물, 가로로 넓으면 시술 현장인 경우가 많다
          cat: bitmap.width / bitmap.height >= 1.5 ? 'salon' : 'portrait',
          note: '',
          fx: 0.5,
          // 얼굴은 대개 위쪽에 있다
          fy: bitmap.width / bitmap.height >= 1.35 ? 0.45 : 0.3,
          state: 'ready',
        })
      } catch {
        setErr(`${file.name} 은 읽을 수 없는 이미지입니다. (HEIC 는 JPG 로 바꿔서 올려 주세요)`)
      }
    }
    if (next.length) setRows((v) => [...v, ...next])
  }, [])

  /** 클립보드 붙여넣기 — 캡처한 사진을 그대로 Ctrl+V */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!boxRef.current?.contains(document.activeElement) && document.activeElement !== document.body)
        return
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (files.length) {
        e.preventDefault()
        void addFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  const patch = (id: string, fn: (r: Pending) => void) =>
    setRows((v) =>
      v.map((r) => {
        if (r.id !== id) return r
        const copy = { ...r }
        fn(copy)
        return copy
      }),
    )

  const drop = (id: string) =>
    setRows((v) => {
      const target = v.find((r) => r.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return v.filter((r) => r.id !== id)
    })

  /** 미리보기를 눌러 크롭 기준점을 옮긴다 */
  const pickFocus = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    patch(id, (r) => {
      r.fx = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
      r.fy = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height))
    })
  }

  const uploadAll = async () => {
    const db = getDb()
    if (!db) {
      setErr('Firebase 환경변수가 없어 올릴 수 없습니다.')
      return
    }
    if (!googleEmail) {
      setErr('관리자 구글 계정으로 로그인해야 사진을 올릴 수 있습니다.')
      return
    }
    setBusy(true)
    setErr('')
    setDoneMsg('')
    const { doc, setDoc } = await import('firebase/firestore')
    // 이름이 겹치지 않도록 이번에 만든 것까지 계속 쌓아 가며 매긴다
    const claimed: Wed100Photo[] = [...uploaded]
    const added: Wed100Photo[] = []
    const okIds = new Set<string>()
    let failed = 0

    for (const row of rows) {
      if (row.state === 'done') continue
      patch(row.id, (r) => {
        r.state = 'busy'
        r.message = undefined
      })
      try {
        const name = nextPhotoName(row.cat, claimed)
        const [heroBlob, thumbBlob] = await Promise.all([
          makeHero(row.bitmap, row.fx, row.fy),
          makeThumb(row.bitmap, row.fx, row.fy),
        ])
        const [hero, thumb] = await Promise.all([
          uploadWed100Photo('hero', name, heroBlob),
          uploadWed100Photo('thumb', name, thumbBlob),
        ])
        const entry: Wed100Photo = {
          name,
          src: row.file.name,
          cat: row.cat,
          focus: [Number(row.fx.toFixed(3)), Number(row.fy.toFixed(3))],
          enabled: true,
          note: row.note.trim() || undefined,
          hero,
          thumb,
          w: row.bitmap.width,
          h: row.bitmap.height,
          uploadedAt: new Date().toISOString(),
        }
        await setDoc(doc(db, 'wed100_photos', name), {
          ...entry,
          note: entry.note ?? null,
        })
        claimed.push(entry)
        added.push(entry)
        okIds.add(row.id)
        patch(row.id, (r) => {
          r.state = 'done'
          r.message = name
        })
      } catch (e) {
        failed++
        patch(row.id, (r) => {
          r.state = 'error'
          r.message = e instanceof Error ? e.message : '올리지 못했습니다.'
        })
      }
    }
    setBusy(false)

    // 부모 카탈로그를 먼저 갱신한 뒤, 마지막에 올린 사진을 문항에 지정한다
    onChange(added)

    if (added.length && applyNow && onApply) {
      const pick = added[added.length - 1]
      onApply(pick)
      setDoneMsg(
        `${added.length}장 올렸습니다. ${pick.name} 을(를) 이 문항 대표 이미지로 지정했습니다 — [저장]을 눌러야 사이트에 반영됩니다.`,
      )
    } else if (added.length) {
      setDoneMsg(`${added.length}장 올렸습니다. 아래 목록에서 골라 주세요.`)
    }
    if (failed) setErr(`${failed}장은 올리지 못했습니다. 아래 빨간 글씨를 확인해 주세요.`)

    // 성공한 줄은 목록에서 치운다 — 두 번 올리는 실수를 막는다.
    // state 가 아니라 방금 성공한 id 로 거른다 (setRows 반영을 기다리지 않아도 된다)
    if (okIds.size) {
      setRows((v) => {
        v.filter((r) => okIds.has(r.id)).forEach((r) => URL.revokeObjectURL(r.url))
        return v.filter((r) => !okIds.has(r.id))
      })
    }
  }

  const waiting = rows.filter((r) => r.state !== 'done').length

  /** 오류·완료 안내 — 목록 위아래 양쪽에 둔다 (사진이 많으면 한쪽은 화면 밖으로 밀린다) */
  const notice =
    err || doneMsg ? (
      <div className="mt-2 space-y-1.5">
        {err && <p className="text-[11px] font-bold text-[#C0392B]">{err}</p>}
        {doneMsg && (
          <p className="flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-emerald-800">
            <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
            {doneMsg}
          </p>
        )}
      </div>
    ) : null

  return (
    <div ref={boxRef} className="rounded-xl border border-[#E7DDD4] bg-[#FCFAF8] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-[#6B5D57]">
          <ImagePlus className="h-3.5 w-3.5 text-[#A63D5A]" /> 새 사진 올리기
        </p>
        <span className="text-[11px] text-[#8A7C74]">올린 사진 {uploaded.length}장</span>
      </div>

      {!googleEmail && (
        <p className="mt-2 rounded-lg bg-[#FDF3E7] px-3 py-2 text-[11px] leading-relaxed text-[#8A6A48]">
          사진 올리기는 <b>관리자 구글 계정 로그인</b>이 필요합니다. 저장소(Storage) 규칙이
          비밀번호 로그인은 받지 않습니다. 위에서 구글로 로그인해 주세요.
        </p>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          void addFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className="mt-2.5 cursor-pointer rounded-lg border-2 border-dashed border-[#DFD2C7] px-4 py-5 text-center transition hover:border-[#A63D5A] hover:bg-white"
      >
        <Upload className="mx-auto h-5 w-5 text-[#A63D5A]" />
        <p className="mt-1.5 text-xs font-bold text-[#6B5D57]">
          사진을 끌어다 놓거나 눌러서 고르세요 · 붙여넣기(Ctrl+V)도 됩니다
        </p>
        <p className="mt-1 text-[11px] text-[#8A7C74]">
          여러 장을 한 번에 올릴 수 있습니다. 히어로(16:9)와 썸네일(정사각)은 자동으로 만듭니다.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {notice}

      {rows.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-start gap-3 rounded-lg border border-[#E7DDD4] bg-white p-2.5"
            >
              {/* 미리보기 — 누르면 그 지점이 크롭 기준이 된다 */}
              <div
                onClick={(e) => pickFocus(r.id, e)}
                title="사진에서 가장 중요한 곳(대개 얼굴)을 누르세요"
                className="relative h-24 w-24 shrink-0 cursor-crosshair overflow-hidden rounded-lg bg-[#eee]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="" className="h-full w-full object-cover" />
                <Crosshair
                  className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_0_2px_rgba(0,0,0,.9)]"
                  style={{ left: `${r.fx * 100}%`, top: `${r.fy * 100}%` }}
                />
              </div>

              <div className="min-w-[220px] flex-1">
                <p className="truncate text-[11px] font-bold text-[#4A403B]">{r.file.name}</p>
                <p className="text-[10px] text-[#8A7C74]">
                  {r.bitmap.width}×{r.bitmap.height} · 기준점 {r.fx.toFixed(2)}, {r.fy.toFixed(2)}
                </p>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {PHOTO_CATS.map((c) => (
                    <button
                      key={c}
                      onClick={() => patch(r.id, (v) => (v.cat = c))}
                      className={`rounded-md border px-2 py-1 text-[10px] font-bold transition ${
                        r.cat === c
                          ? 'border-[#A63D5A] bg-[#A63D5A] text-white'
                          : 'border-[#E7DDD4] text-[#6B5D57] hover:border-[#DFD2C7]'
                      }`}
                    >
                      {PHOTO_CAT_LABEL[c] ?? c}
                    </button>
                  ))}
                </div>

                <input
                  value={r.note}
                  onChange={(e) => patch(r.id, (v) => (v.note = e.target.value))}
                  placeholder="설명 (예: 분홍 저고리 측면, 쪽머리 비녀)"
                  className="mt-1.5 w-full rounded-md border border-[#E7DDD4] px-2 py-1.5 text-[11px] outline-none focus:border-[#A63D5A]"
                />

                {r.message && (
                  <p
                    className={`mt-1 text-[11px] font-bold ${
                      r.state === 'error' ? 'text-[#C0392B]' : 'text-[#2E7D5B]'
                    }`}
                  >
                    {r.state === 'error' ? r.message : `${r.message} 으로 저장됨`}
                  </p>
                )}
              </div>

              <button
                onClick={() => drop(r.id)}
                disabled={r.state === 'busy'}
                aria-label="목록에서 빼기"
                className="rounded-md p-1.5 text-[#8A7C74] hover:bg-[#F5EFE9] hover:text-[#C0392B] disabled:opacity-40"
              >
                {r.state === 'busy' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}

          {onApply && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-[#6B5D57]">
              <input
                type="checkbox"
                checked={applyNow}
                onChange={(e) => setApplyNow(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#A63D5A]"
              />
              올린 뒤 바로 {applyLabel ? `“${applyLabel}”` : '이 문항'} 대표 이미지로 지정
            </label>
          )}

          {notice}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void uploadAll()}
              disabled={busy || waiting === 0 || !googleEmail}
              className="flex items-center gap-1.5 rounded-lg bg-[#A63D5A] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#8E3049] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {busy ? '올리는 중…' : `${waiting}장 올리기`}
            </button>
            {!googleEmail && (
              // 버튼이 왜 눌리지 않는지 버튼 옆에서 바로 알려 준다.
              // 위쪽 안내문은 목록이 길어지면 화면 밖으로 밀려 보이지 않는다.
              <span className="text-[11px] font-bold text-[#C0392B]">
                ← 구글 계정으로 로그인해야 눌립니다 (비밀번호 로그인은 사진 올리기 불가)
              </span>
            )}
            <button
              onClick={() => {
                rows.forEach((r) => URL.revokeObjectURL(r.url))
                setRows([])
              }}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-[#E7DDD4] px-3 py-2 text-xs font-bold text-[#6B5D57] disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" /> 목록 비우기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
