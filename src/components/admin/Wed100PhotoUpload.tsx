'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, X, Loader2, Crosshair, Trash2 } from 'lucide-react'

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

export default function Wed100PhotoUpload({
  uploaded,
  googleEmail,
  onChange,
}: {
  uploaded: Wed100Photo[]
  /** 구글 관리자 계정 — 비밀번호 로그인이면 null */
  googleEmail: string | null
  onChange: () => void
}) {
  const [rows, setRows] = useState<Pending[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 미리보기 URL 정리
  useEffect(() => {
    return () => rows.forEach((r) => URL.revokeObjectURL(r.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setErr('')
    const next: Pending[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const bitmap = await createImageBitmap(file)
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
        setErr(`${file.name} 은 읽을 수 없는 이미지입니다.`)
      }
    }
    setRows((v) => [...v, ...next])
  }, [])

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
    const { doc, setDoc } = await import('firebase/firestore')
    // 이름이 겹치지 않도록 이번에 만든 것까지 계속 쌓아 가며 매긴다
    const claimed: Wed100Photo[] = [...uploaded]

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
        }
        await setDoc(doc(db, 'wed100_photos', name), {
          ...entry,
          note: entry.note ?? null,
          uploadedAt: new Date().toISOString(),
        })
        claimed.push(entry)
        patch(row.id, (r) => {
          r.state = 'done'
          r.message = name
        })
      } catch (e) {
        patch(row.id, (r) => {
          r.state = 'error'
          r.message = e instanceof Error ? e.message : '올리지 못했습니다.'
        })
      }
    }
    setBusy(false)
    onChange()
  }

  const waiting = rows.filter((r) => r.state !== 'done').length

  return (
    <div className="rounded-xl border border-[#E7DDD4] bg-[#FCFAF8] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#6B5D57]">사진 올리기</p>
        <span className="text-[11px] text-[#8A7C74]">
          올린 사진 {uploaded.length}장 · 아래 목록에서 바로 고를 수 있습니다
        </span>
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
        className="mt-2.5 cursor-pointer rounded-lg border-2 border-dashed border-[#DFD2C7] px-4 py-6 text-center transition hover:border-[#A63D5A] hover:bg-white"
      >
        <Upload className="mx-auto h-5 w-5 text-[#A63D5A]" />
        <p className="mt-1.5 text-xs font-bold text-[#6B5D57]">
          사진을 끌어다 놓거나 눌러서 고르세요
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

      {err && <p className="mt-2 text-[11px] font-bold text-[#C0392B]">{err}</p>}

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void uploadAll()}
              disabled={busy || waiting === 0}
              className="flex items-center gap-1.5 rounded-lg bg-[#A63D5A] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#8E3049] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {busy ? '올리는 중…' : `${waiting}장 올리기`}
            </button>
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
