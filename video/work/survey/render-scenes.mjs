// scenes.html 의 장면 넷을 1080×1920 mp4 로. 애니메이션은 CSS 라 실시간으로 스크린샷을 찍는다(record.mjs 와 같은 방식).
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const DUR = { clock: 3.5, admin: 5.0, number: 4.5, end: 6.0 } // 초 — 장면표의 길이에 여유 0.5
const here = import.meta.dirname
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
for (const [name, dur] of Object.entries(DUR)) {
  const out = resolve(here, 'rec', name)
  mkdirSync(out, { recursive: true })
  await page.goto(`file://${here}/scenes.html?scene=${name}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(100)
  const t0 = Date.now()
  const frames = []
  while ((Date.now() - t0) / 1000 < dur) {
    const t = (Date.now() - t0) / 1000
    await page.screenshot({ path: resolve(out, `f${String(frames.length).padStart(4, '0')}.png`), animations: 'allow' })
    frames.push(t)
  }
  let list = ''
  frames.forEach((t, i) => {
    const d = i + 1 < frames.length ? frames[i + 1] - t : 0.1
    list += `file 'f${String(i).padStart(4, '0')}.png'\nduration ${d.toFixed(4)}\n`
  })
  list += `file 'f${String(frames.length - 1).padStart(4, '0')}.png'\n`
  writeFileSync(resolve(out, 'frames.txt'), list)
  execSync(`ffmpeg -loglevel error -y -f concat -safe 0 -i frames.txt -vf "fps=25,format=yuv420p" -c:v libx264 -crf 18 ../${name}.mp4`, { cwd: out })
  console.log(name, frames.length, 'frames')
}
await browser.close()
