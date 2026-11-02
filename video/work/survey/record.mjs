// 설문봇(/honjoo100#ask) 실화면 녹화 — 쇼츠 A 의 0:03~0:30 구간 원본.
// 로컬 dev 를 상대로 돌리고, /api/consult-lead 는 가로채서 200 을 돌려준다 —
// 실제 접수함에 가짜가 들어가면 원장님 폰에 알림이 가므로 서버까지 보내지 않는다.
// 글꼴은 CDN(jsdelivr)에서 오는데 이 환경에서 막히므로 로컬 Pretendard 를 덮어씌운다.
// 각 단계의 시각을 steps.json 에 남겨 자막 타이밍을 맞춘다.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const OUT = resolve(import.meta.dirname, 'rec')
const W = 1080, H = 1920
const fontB = readFileSync(resolve(import.meta.dirname, 'fonts/Pretendard-Bold.otf'))
const fontR = readFileSync(resolve(import.meta.dirname, 'fonts/Pretendard-Regular.otf'))

// --force-device-scale-factor: CDP 스크린캐스트는 컨텍스트의 deviceScaleFactor 를 무시하고 CSS 픽셀로 내보낸다. 브라우저 자체를 2배로 띄워야 1080×1920 이 나온다
// 8차: 뷰포트를 540→400 CSS 픽셀로 좁히고 배율을 2→2.7 로. 같은 1080×1920 이지만 레이아웃이 좁은 폰 기준으로 다시 짜여
// 말풍선 글자가 35% 커진다. (처음엔 영상에서 가운데를 확대해 봤는데 좌우가 잘려 손님 말풍선이 끊겼다 — 확대가 아니라 다시 그리는 쪽이 맞다.)
const SC = W / 400
const browser = await chromium.launch({ args: [`--force-device-scale-factor=${SC}`] })
const ctx = await browser.newContext({
  viewport: { width: 400, height: Math.round(H / SC) },
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
// CDP 스크린캐스트 — 바뀐 화면마다 브라우저가 2x 프레임을 밀어 준다(스크린샷 루프는 5fps 가 한계였다).
// 가만히 있을 땐 프레임이 안 오므로 concat 의 duration 이 그 정지 시간을 채운다.
const cdp = await ctx.newCDPSession(page)
cdp.on('Page.screencastFrame', async ({ data, sessionId, metadata }) => {
  const i = frames.length
  frames.push({ i, t: (Date.now() - t0) / 1000 })
  writeFileSync(resolve(OUT, `frames/f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64'))
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
const mark = (k, xy) => steps.push({ k, t: (Date.now() - t0) / 1000, ...(xy ? { x: xy.x * SC, y: xy.y * SC } : {}) })
// 단추를 누르고 그 중심 좌표를 함께 기록한다
async function tap(loc, k) {
  // boundingBox 는 그 순간의 뷰포트 기준 — 부드러운 스크롤이 끝난 뒤 재야 좌표가 맞는다
  await loc.scrollIntoViewIfNeeded(); await page.waitForTimeout(250)
  const b = await loc.boundingBox()
  await loc.click()
  mark(k, b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null)
}
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
  #ask [aria-live]{max-height:600px!important} #ask ~ *{display:none!important} main ~ *{display:none!important} .site-controls{display:none!important} [aria-label="글자 크기"]{display:none!important} [aria-label$="모드로 바꾸기"]{display:none!important}`,
})
await page.evaluate(() => document.fonts.ready)
// 설문 상자를 화면 가운데에 — 상자 윗부분이 잘리지 않게
await page.evaluate(() => document.getElementById('ask')?.scrollIntoView({ block: 'start' }))
await wait(300)
await page.evaluate(() => window.scrollBy(0, -60))
mark('ask-visible')
await wait(2100) // 첫 인사 두 줄(0.7초 간격) 이 다 뜨도록

const choice = (t) => page.getByRole('button', { name: t, exact: true })
await tap(choice('신부 어머님이에요'), 'who')
await wait(1900)
await tap(choice('한복 색을 못 고르겠어요'), 'worry')
await wait(3500) // 답 네 줄
// 이용권 상자와 단추들이 보이게 상자 안을 내림(컴포넌트가 스스로 내린다). 잠깐 머문다
mark('offer')
await wait(1700)
await tap(choice('원장님 연락 받기'), 'form')
await wait(1500)
await page.getByLabel('성함').fill('김○○'); await wait(400)
await page.getByPlaceholder('010-0000-0000').fill('010-••••-1234'); await wait(400)
await choice('1~3개월').click(); await wait(400)
await page.getByRole('checkbox').check(); await wait(500)
mark('typed')
await tap(choice('원장님께 연락 요청'), 'submit')
await wait(2100) // "잘 받았어요" 두 줄
mark('end')

await wait(300)
await cdp.send('Page.stopScreencast')
await ctx.close()
await browser.close()
// concat 목록: 프레임마다 다음 프레임까지의 간격
let list = ''
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 1 / 12
  list += `file 'frames/f${String(i).padStart(4, '0')}.jpg'\nduration ${d.toFixed(4)}\n`
}
list += `file 'frames/f${String(frames.length - 1).padStart(4, '0')}.jpg'\n`
writeFileSync(resolve(OUT, 'frames.txt'), list)
writeFileSync(resolve(OUT, 'steps.json'), JSON.stringify(steps, null, 2))
// frames.txt → survey.mp4. assemble.sh 가 이 파일을 읽는다(이 한 줄이 빠져 있어 맥에서 처음 돌릴 때 survey.mp4 가 없었다).
// 스크린캐스트는 가변 간격이라 30fps 로 고정해 이어 붙인다
execSync(`ffmpeg -loglevel error -y -f concat -safe 0 -i frames.txt -vf "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -crf 17 survey.mp4`, { cwd: OUT })
console.log(JSON.stringify(steps))
