// scenes.html 의 장면 넷을 1080×1920 mp4 로. 애니메이션은 CSS 라 실시간으로 스크린샷을 찍는다(record.mjs 와 같은 방식).
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const DUR = { hook: 3.4, clock: 2.6, admin: 5.0, number: 4.5, end: 6.0 } // 초 — 장면표의 길이에 여유 0.5
const here = import.meta.dirname
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
for (const [name, dur] of Object.entries(DUR)) {
  const out = resolve(here, 'rec', name)
  mkdirSync(out, { recursive: true })
  await page.goto(`file://${here}/scenes.html?scene=${name}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(100)
  const frames = []
  const cdp = await page.context().newCDPSession(page)
  const t0 = Date.now()
  cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
    const i = frames.length
    frames.push((Date.now() - t0) / 1000)
    writeFileSync(resolve(out, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64'))
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 })
  // 마지막 정지 화면도 프레임으로 남게 끝에서 한 번 더 그린다
  await page.waitForTimeout(dur * 1000)
  await cdp.send('Page.stopScreencast')
  await cdp.detach()
  let list = ''
  frames.forEach((t, i) => {
    const d = i + 1 < frames.length ? frames[i + 1] - t : Math.max(0.1, dur - t) // 마지막 프레임은 장면 끝까지 멈춰 있는다
    list += `file 'f${String(i).padStart(4, '0')}.jpg'\nduration ${d.toFixed(4)}\n`
  })
  list += `file 'f${String(frames.length - 1).padStart(4, '0')}.jpg'\n`
  writeFileSync(resolve(out, 'frames.txt'), list)
  execSync(`ffmpeg -loglevel error -y -f concat -safe 0 -i frames.txt -vf "scale=1080:1920:flags=lanczos,fps=25,format=yuv420p" -c:v libx264 -crf 18 ../${name}.mp4`, { cwd: out })
  console.log(name, frames.length, 'frames')
}
await browser.close()
