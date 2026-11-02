// 설문봇(/honjoo100#ask) 실화면 녹화 — 쇼츠 A 의 0:03~0:30 구간 원본.
// 로컬 dev 를 상대로 돌리고, /api/consult-lead 는 가로채서 200 을 돌려준다 —
// 실제 접수함에 가짜가 들어가면 원장님 폰에 알림이 가므로 서버까지 보내지 않는다.
// 글꼴은 CDN(jsdelivr)에서 오는데 이 환경에서 막히므로 로컬 Pretendard 를 덮어씌운다.
// 각 단계의 시각을 steps.json 에 남겨 자막 타이밍을 맞춘다.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const OUT = resolve(import.meta.dirname, 'rec')
const W = 1080, H = 1920
const fontB = readFileSync(resolve(import.meta.dirname, 'fonts/Pretendard-Bold.otf'))
const fontR = readFileSync(resolve(import.meta.dirname, 'fonts/Pretendard-Regular.otf'))

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 2,
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
})
const page = await ctx.newPage()
await page.route('**/__font/*.otf', (r) => r.fulfill({ body: r.request().url().endsWith('Bold.otf') ? fontB : fontR, contentType: 'font/otf' }))
await page.route('**/cdn.jsdelivr.net/**', (r) => r.abort())
await page.route('**/api/consult-lead', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }))
await page.route('**/api/survey-event', (r) => r.fulfill({ status: 204 }))
await page.route('**/api/track', (r) => r.fulfill({ status: 204 }))

import { mkdirSync } from 'node:fs'
mkdirSync(resolve(OUT, 'frames'), { recursive: true })
const t0 = Date.now()
const steps = []
const frames = []
let shooting = false
// 12fps 로 화면을 찍는다 — 각 프레임의 실제 시각을 남겨 ffmpeg concat 에서 길이를 맞춘다
const timer = setInterval(async () => {
  if (shooting) return
  shooting = true
  try {
    const i = frames.length
    const t = (Date.now() - t0) / 1000
    await page.screenshot({ path: resolve(OUT, `frames/f${String(i).padStart(4, '0')}.png`), type: 'png', animations: 'allow', caret: 'hide' })
    frames.push({ i, t })
  } catch {}
  shooting = false
}, 1000 / 12)
const mark = (k) => steps.push({ k, t: (Date.now() - t0) / 1000 })
const wait = async (ms) => {
  await page.waitForTimeout(Math.min(ms, 900))
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }))
  if (ms > 900) await page.waitForTimeout(ms - 900)
}

await page.goto(`${BASE}/honjoo100`, { waitUntil: 'networkidle' })
await page.addStyleTag({
  content: `@font-face{font-family:PL;src:url(/__font/Pretendard-Regular.otf)}@font-face{font-family:PL;font-weight:700;src:url(/__font/Pretendard-Bold.otf)}
  @font-face{font-family:PL;font-weight:800;src:url(/__font/Pretendard-Bold.otf)}
  *{font-family:PL,sans-serif!important} html{scroll-behavior:auto!important} .fixed{display:none!important} nextjs-portal{display:none!important}
  #ask [aria-live]{max-height:600px!important} #ask ~ *{display:none!important} main ~ *{display:none!important}`,
})
await page.evaluate(() => document.fonts.ready)
// 설문 상자를 화면 가운데에 — 상자 윗부분이 잘리지 않게
await page.evaluate(() => document.getElementById('ask')?.scrollIntoView({ block: 'start' }))
await wait(300)
await page.evaluate(() => window.scrollBy(0, -60))
mark('ask-visible')
await wait(2600) // 첫 인사 두 줄(0.7초 간격) 이 다 뜨도록

const choice = (t) => page.getByRole('button', { name: t, exact: true })
await choice('신부 어머님이에요').click(); mark('who')
await wait(2400)
await choice('한복 색을 못 고르겠어요').click(); mark('worry')
await wait(4200) // 답 네 줄
// 이용권 상자와 단추들이 보이게 상자 안을 내림(컴포넌트가 스스로 내린다). 잠깐 머문다
mark('offer')
await wait(2200)
await choice('원장님 연락 받기').click(); mark('form')
await wait(2000)
await page.getByLabel('성함').fill('김○○'); await wait(400)
await page.getByPlaceholder('010-0000-0000').fill('010-••••-1234'); await wait(400)
await choice('1~3개월').click(); await wait(400)
await page.getByRole('checkbox').check(); await wait(500)
mark('typed')
await choice('원장님께 연락 요청').click(); mark('submit')
await wait(2600) // "잘 받았어요" 두 줄
mark('end')

clearInterval(timer)
await wait(300)
await ctx.close()
await browser.close()
// concat 목록: 프레임마다 다음 프레임까지의 간격
let list = ''
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1 / 12
  list += `file 'frames/f${String(i).padStart(4, '0')}.png'\nduration ${d.toFixed(4)}\n`
}
list += `file 'frames/f${String(frames.length - 1).padStart(4, '0')}.png'\n`
writeFileSync(resolve(OUT, 'frames.txt'), list)
writeFileSync(resolve(OUT, 'steps.json'), JSON.stringify(steps, null, 2))
console.log(JSON.stringify(steps))
