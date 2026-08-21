/**
 * 브라우저에서 원본 사진을 히어로(16:9)·썸네일(1:1) WebP 로 만든다.
 *
 * 서버(Vercel)에는 sharp 나 ffmpeg 이 없어서 캔버스로 처리한다.
 * 잘라내는 규칙은 scripts/wed100/4_build_photos.py 와 똑같이 맞춰서,
 * 스크립트로 만든 사진과 어드민에서 올린 사진이 같은 모양이 되도록 했다.
 */

export const HERO_W = 1600
export const HERO_H = 900
export const THUMB = 800
const QUALITY = 0.82

/**
 * 파이썬 round() 와 같은 반올림 — 딱 0.5 면 짝수 쪽으로 간다.
 * JS 의 Math.round 는 올림이라 그대로 두면 크롭 크기가 1px 씩 어긋난다.
 */
function pyRound(v: number): number {
  const f = Math.floor(v)
  const d = v - f
  if (d > 0.5) return f + 1
  if (d < 0.5) return f
  return f % 2 === 0 ? f : f + 1
}

/** 원본 안에 들어가는 가장 큰 ratio 사각형을 기준점 중심으로 잘라낸다 */
function cropRect(w: number, h: number, ratio: number, fx: number, fy: number) {
  let tw: number
  let th: number
  if (w / h >= ratio) {
    // 원본이 더 넓다 → 높이를 다 쓰고 좌우를 자른다
    tw = pyRound(h * ratio)
    th = h
  } else {
    // 원본이 더 좁다 → 너비를 다 쓰고 위아래를 자른다
    tw = w
    th = pyRound(w / ratio)
  }
  tw = Math.min(tw, w)
  th = Math.min(th, h)
  // 파이썬 쪽 int() 와 같게 버림으로 맞춘다 (반올림하면 1px 씩 어긋난다)
  const x = Math.min(Math.max(Math.trunc(w * fx - tw / 2), 0), w - tw)
  const y = Math.min(Math.max(Math.trunc(h * fy - th / 2), 0), h - th)
  return { x, y, w: tw, h: th }
}

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('캔버스를 만들 수 없습니다.')
  ctx.imageSmoothingQuality = 'high'
  return { c, ctx }
}

/** 흐린 배경 위에 원본을 통째로 얹는다 — 세로 사진에서 얼굴이 잘리지 않게 */
function blurBackdrop(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  src: { x: number; y: number; w: number; h: number },
  outW: number,
  outH: number,
  blur: number,
) {
  const supported = typeof ctx.filter === 'string'
  if (supported) ctx.filter = `blur(${blur}px) brightness(1.12) saturate(0.55)`
  // 블러가 가장자리를 비우지 않도록 살짝 넘치게 그린다
  const over = supported ? blur * 2 : 0
  ctx.drawImage(img, src.x, src.y, src.w, src.h, -over, -over, outW + over * 2, outH + over * 2)
  if (supported) ctx.filter = 'none'
}

async function toWebp(c: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/webp', QUALITY))
  if (!blob) throw new Error('WebP 로 바꾸지 못했습니다. 브라우저를 최신으로 올려 주세요.')
  return blob
}

export async function makeHero(img: ImageBitmap, fx: number, fy: number): Promise<Blob> {
  const { width: w, height: h } = img
  const { c, ctx } = canvasOf(HERO_W, HERO_H)
  const src = cropRect(w, h, HERO_W / HERO_H, fx, fy)
  if (w / h >= 1.35) {
    // 가로 사진 — 그냥 잘라낸다
    ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, HERO_W, HERO_H)
    return toWebp(c)
  }
  // 세로·정사각 사진 — 잘라내면 얼굴이 날아가므로 블러 배경 위에 얹는다
  blurBackdrop(ctx, img, src, HERO_W, HERO_H, 38)
  const fw = Math.round((HERO_H * w) / h)
  ctx.drawImage(img, 0, 0, w, h, Math.round((HERO_W - fw) / 2), 0, fw, HERO_H)
  return toWebp(c)
}

export async function makeThumb(img: ImageBitmap, fx: number, fy: number): Promise<Blob> {
  const { width: w, height: h } = img
  const { c, ctx } = canvasOf(THUMB, THUMB)
  const ratio = w / h
  if (ratio > 1.7 || ratio < 0.59) {
    // 아주 납작하거나 아주 긴 사진 — 정사각으로 자르면 내용이 반 넘게 날아간다
    blurBackdrop(ctx, img, cropRect(w, h, 1, fx, fy), THUMB, THUMB, 28)
    const s = Math.min(THUMB / w, THUMB / h)
    const fw = Math.round(w * s)
    const fh = Math.round(h * s)
    ctx.drawImage(img, 0, 0, w, h, Math.round((THUMB - fw) / 2), Math.round((THUMB - fh) / 2), fw, fh)
    return toWebp(c)
  }
  // 썸네일은 정사각이라 얼굴이 중앙에 오도록 살짝 위를 본다
  const src = cropRect(w, h, 1, fx, Math.max(0, fy - 0.03))
  ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, THUMB, THUMB)
  return toWebp(c)
}
