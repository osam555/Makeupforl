"""6~10위 리메이크 쇼츠 5편 일부 공개 업로드 (2026-11-16 사용자 승인 「굿. 업로드」).
yt_upload.py 흐름을 따르되 일부 공개 대신 공개로 내고, 재생목록에 넣고, 기록을 남긴다. python3 topup.py 5-1 …"""
import base64, json, re, subprocess, sys, time
from pathlib import Path
_argv, sys.argv = sys.argv, sys.argv[:1]   # yt_upload 은 import 할 때 argv 의 slug 를 바로 올린다 — 비워 두고 부른다
from yt_upload import SITE, TAG, PASS, CH, repl
sys.argv = _argv

J = json.dumps
LOG = Path("/Users/osam/dev/makeupforl/.claude/worktrees/top6-10-remake-cf9a7d/video/work/top12-20/uploads")
ADDPL = "/private/tmp/claude-501/-Users-osam-dev-makeupforl--claude-worktrees-wed100-i2v-plan-438f77/25aed21f-3a7d-4571-93c8-22f3a6501c4f/scratchpad/addpl.py"

R = Path("/Users/osam/dev/makeupforl/.claude/worktrees/top6-10-remake-cf9a7d")
SPEC = {}
for f in ("shorts-12-20.json",):
    SPEC.update({k: v for k, v in json.load(open(R / "video/scripts/top5" / f)).items() if not k.startswith("_")})
ORIG = {"12": "WbpZ_-2CBE4", "13": "VP2L6rFYETc", "14": "pXRPh4M1T8A", "15": "835NGcS08Lc", "16": "iou2gLiXSjk", "17": "UxwXHP9rCLA", "18": "_UvOY1WkEO4", "20": "batExmBLXqU"}


def desc(ep):
    p = SPEC[ep]
    head = (f"▶ 전체 답변(잠금): {SITE}/{p['target']}{TAG}\n"
            f"   이어지는 질문 — {p['question']} (목록 {p['label']})\n")
    orig = f"▶ 원본 영상: https://youtu.be/{ORIG[ep]}\n"
    return head + PASS + "\n" + orig + "메이크업포엘 대표원장 김성희의 「혼주메이크업 100문 100답」\n생성형 AI 이미지와 AI 음성으로 만든 영상입니다.", head + PASS


def record(ep, vid, log_dir, playlist=False, pin=False):
    p = SPEC[ep]; log_dir = Path(log_dir); log_dir.mkdir(parents=True, exist_ok=True)
    rec = {"ep": ep, "vid": vid, "title": p["title"], "target": p["target"], "label": p["label"],
           "vis": "public", "date": "2026-11-16", "playlist": playlist, "pin": pin}
    json.dump(rec, open(log_dir / f"up_{ep}.json", "w"), ensure_ascii=False)
    return rec


def main(ep):
    p = SPEC[ep]; title = p["title"]; key = title.split(" #")[0]
    o0 = repl(f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}/videos/short"); await sleep(10000);
console.log('EXISTS', await P.evaluate((k) => [...document.querySelectorAll('ytcp-video-row')].some(x=>x.innerText.includes(k)), {J(key)}));
""")
    if "EXISTS true" in o0:
        print(ep, "already uploaded — skip", flush=True); return
    mine, pin = desc(ep)
    b64 = base64.b64encode((R / f"video/out/shorts/top12-20/{ep}_v1.mp4").read_bytes()).decode()
    o = repl(f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}"); await sleep(9000);
if (!P.url().includes({J(CH)})) throw new Error('wrong channel ' + P.url());
await fs.writeFile(pwd + '/v.mp4', Buffer.from({J(b64)}, 'base64'));
await P.getByRole('button', {{name: '만들기'}}).first().click(); await sleep(1500);
await P.getByText('동영상 업로드').first().click(); await sleep(3000);
const [fc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 20000}}), P.locator('#select-files-button').click()]);
await fc.setFiles(pwd + '/v.mp4');
const tb = P.locator('#title-textarea #textbox'); await tb.waitFor({{timeout: 60000}}); await sleep(3000);
await tb.click(); await P.keyboard.press('Meta+A'); await P.keyboard.insertText({J(title)}); await sleep(2000);
for (let k=0;k<40;k++) {{ const t = await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText||''); if (!/업로드 중/.test(t)) break; await sleep(2000); }}
console.log('UPLOADED');
""")
    print(ep, "upload", "ok" if "UPLOADED" in o else o[-300:], flush=True)
    if "UPLOADED" not in o: return
    time.sleep(20)
    o = repl(f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}/videos/short"); await sleep(10000);
const idx = await P.evaluate((k) => [...document.querySelectorAll('ytcp-video-row')].filter(x=>/초안 수정/.test(x.innerText)).findIndex(x=>x.innerText.includes(k)), {J(key)});
if (idx < 0) throw new Error('no draft row for key');
await P.getByText('초안 수정').nth(idx).click(); await sleep(7000);
const ttl = await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #title-textarea')?.innerText || '');
if (!ttl.includes({J(key)})) throw new Error('wrong draft ' + ttl.slice(0,80));
const db = P.locator('#description-textarea #textbox'); const cur = await db.innerText();
if (!cur.startsWith('▶ 전체 답변')) {{ await db.click(); await P.keyboard.press('Meta+A'); await P.keyboard.press('Backspace'); await sleep(400); await P.keyboard.insertText({J(mine)} + "\\n\\n" + cur.trim()); await sleep(1200); }}
console.log('DESC', (await db.innerText()).startsWith('▶ 전체 답변'));
const kids = P.locator('[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'); if ((await kids.getAttribute('aria-checked')) !== 'true') {{ await kids.click(); await sleep(600); }}
await P.locator('#toggle-button').click(); await sleep(1200);
const alt = P.locator('[name="VIDEO_HAS_ALTERED_CONTENT_YES"]'); await alt.scrollIntoViewIfNeeded(); if ((await alt.getAttribute('aria-checked')) !== 'true') {{ await alt.click(); await sleep(600); }}
console.log('ALT', await alt.getAttribute('aria-checked'));
for (let i = 0; i < 6; i++) {{
  if (await P.locator('tp-yt-paper-radio-button[name="PUBLIC"]').isVisible().catch(()=>false)) break;
  const none = P.getByText('해당 사항 없음', {{exact: true}}).first();
  if (await none.isVisible().catch(()=>false)) {{ await none.click(); await sleep(1200); await P.getByText('평가 제출', {{exact: true}}).first().click(); await sleep(3500); }}
  for (let w = 0; w < 15 && (await P.locator('#next-button').getAttribute('aria-disabled')) === 'true'; w++) await sleep(2000);
  await P.locator('#next-button').click(); await sleep(3000);
}}
const pb = P.locator('tp-yt-paper-radio-button[name="PUBLIC"]'); await pb.click(); await sleep(1200);
console.log('PUBLIC', await pb.getAttribute('aria-checked'));
const link = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtube\\.com\\/shorts/.test(h)));
console.log('LINK', link);
for (let k = 0; k < 3; k++) {{  // 「Shorts 광고 수익 공유」 안내가 게시 단추를 가린다 — 닫고 다시 누른다
  const cl = P.locator('ytcp-uploads-dialog').getByText('닫기', {{exact: true}}); if (await cl.count()) {{ await cl.first().click().catch(()=>{{}}); await sleep(1500); }}
  await P.locator('#done-button').click(); await sleep(8000);
  if (!(await P.locator('ytcp-uploads-dialog #done-button').isVisible().catch(()=>false))) break;
}}
""")
    time.sleep(10)
    vis = repl(f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}/videos/short"); await sleep(10000);
console.log('VIS', await P.evaluate((k) => {{ const r=[...document.querySelectorAll('ytcp-video-row')].find(x=>x.innerText.includes(k)); return r ? r.innerText.split('\\n').map(s=>s.trim()).find(x=>/^(공개|일부 공개|비공개|초안)$/.test(x)) : 'none'; }}, {J(key)}));
""")
    print(ep, "visibility", (re.search(r"VIS (\S+)", vis) or [None, "?"])[1], flush=True)
    m = re.search(r"LINK https://youtube\.com/shorts/([\w-]+)", o)
    print(ep, "finish", " ".join(l for l in o.splitlines() if re.match(r"(DESC|ALT|PUBLIC|LINK)", l)) or o[-300:], flush=True)
    if not m: return
    vid = m.group(1)
    record(ep, vid, LOG)
    time.sleep(15)
    pl = False  # 일부 공개라 공개 재생목록에는 넣지 않는다
    o = repl(f"""
const P = await openTab("https://www.youtube.com/watch?v={vid}"); await sleep(9000);
await P.evaluate(() => window.scrollBy(0, 700)); await sleep(4000);
const ph = P.locator('#simplebox-placeholder'); await ph.waitFor({{timeout: 20000}}); await ph.click(); await sleep(1500);
const who = await P.evaluate(() => document.querySelector('ytd-comment-simplebox-renderer img')?.alt || '');
if (!/메이크업포엘|혼주메이크업/.test(who)) throw new Error('not channel: ' + who);
await P.locator('#contenteditable-root').click(); await P.keyboard.insertText({J(pin)}); await sleep(800);
await P.locator('#submit-button').click(); await sleep(6000);
const th = P.locator('ytd-comment-thread-renderer').filter({{hasText: 'honjoo100/{p["target"]}'}}).first();
await th.hover(); await sleep(800); await th.locator('#action-menu button').first().click(); await sleep(1500);
await P.getByText(/^고정$|^Pin$/).first().click(); await sleep(1500);
await P.getByRole('button', {{name: /고정|Pin/}}).last().click(); await sleep(4000);
console.log('PINNED');
""")
    print(ep, "pin", "PINNED" in o, flush=True)
    record(ep, vid, LOG, playlist=pl, pin="PINNED" in o)


if __name__ == "__main__":
    for e in sys.argv[1:]:
        try:
            main(e)
        except Exception as ex:
            print(e, "ERROR", ex, flush=True)
