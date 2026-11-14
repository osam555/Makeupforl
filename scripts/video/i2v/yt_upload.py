"""5편 일부 공개 업로드 — 채널 확인 → 파일+제목 → 초안 마무리(설명·아동·AI·광고적합성·일부 공개) → 목록 공개상태 확인 → 고정 댓글."""
import base64, json, os, re, subprocess, sys, tempfile, time
from pathlib import Path
S = Path(__file__).parent / "specs"
R = Path(__file__).resolve().parents[3]  # 저장소 뿌리 — worktree 경로를 박아 두면 worktree 를 지우는 순간 깨진다
CH = "UCtlSwebjXpbjnasvIMMTLZA"
J = json.dumps
TITLES = {"p1-06": "사전 컨설팅, 꼭 해야 하나요?", "p2-05": "혼주 머리, 미리 해 보면 달라질까?",
          "p3-15": "혼주 눈물 걱정, 화장 괜찮을까?", "p4-07": "둥근 얼굴, 혼주 머리는 이렇게",
          "p5-13": "한복엔 어떤 귀걸이? 진주가 답이에요"}

def repl(js, t=280):
    d = Path(tempfile.mkdtemp()); (d / "s.js").write_text(js)
    r = subprocess.run(["aside", "repl", "--file", str(d / "s.js")], capture_output=True, text=True, timeout=t)
    return "\n".join(l for l in (r.stdout + r.stderr).splitlines() if not l.startswith("[system]"))

SITE = "https://makeupforl.co.kr/honjoo100"
TAG = "?from=yt"  # 설명란 링크로 온 방문도 「유튜브 쇼츠」로 센다(src/lib/trackSource.ts). 쇼츠 화면에선 링크가 안 눌려도 일반 보기에선 눌린다
SET = os.environ.get("I2V_SET", "free5.json")
PASS = ("▶ 100문 100답 — 원장이 상담실에서만 하던 답 98개 · 음성 103분\n"
        "▶ 3개월 이용권 55,000원 · 메이크업 예약하면 이용권 값 전액 차감 · 신청 전화 02-323-3321")


def texts(slug, allp, spec):
    """설명란·고정 댓글. 무료 문항은 답 + 다음 잠긴 문항, 잠긴 문항은 바로 그 문항(잠금 페이지가 곧 판매 페이지)."""
    p = allp[slug]
    if "loop" in p:  # 잠긴 문항
        head = (f"▶ 전체 답변(잠금): {SITE}/{slug}{TAG}\n"
                f"   남은 답 — {p['loop']} (목록 {p['label']})\n")
    else:
        head = f"▶ 전체 답변: {SITE}/{slug}{TAG}\n▶ 다음 질문(잠금): {SITE}/{spec['next']}{TAG}\n"
    mine = head + PASS + "\n메이크업포엘 대표원장 김성희의 「혼주메이크업 100문 100답」\n생성형 AI 이미지로 만든 장면입니다."
    return mine, head + PASS


def main(slug):
    allp = json.load(open(S / SET)); spec = json.load(open(S / f"{slug}.json"))
    nxt = spec.get("next", slug)
    short = TITLES.get(slug) or allp[slug]["title"]
    title = f"{short} | 혼주메이크업 100문 100답 {allp[slug]['tag']} #shorts"
    mine, pin = texts(slug, allp, spec)
    f = R / f"video/out/shorts/i2v/{slug}_v1.mp4"
    b64 = base64.b64encode(f.read_bytes()).decode()
    key = short[:8]  # 목록에서 행을 찾는 열쇠 — 옛 제목과 앞 8자가 겹치지 않게 지을 것(9절 ③)
    # 0) 이미 올라가 있으면 올리기를 건너뛴다(다시 돌릴 때 중복 업로드 방지)
    o0 = repl(f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}/videos/short"); await sleep(10000);
console.log('EXISTS', await P.evaluate((k) => [...document.querySelectorAll('ytcp-video-row')].some(x=>x.innerText.includes(k)), {J(key)}));
""")
    exists = "EXISTS true" in o0
    # 1) 올리기
    o = "UPLOADED (skipped)" if exists else repl(f"""
const P = await openTab("https://studio.youtube.com/"); await sleep(9000);
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
    print(slug, "upload", "ok" if "UPLOADED" in o else o[-300:], flush=True)
    if "UPLOADED" not in o: return
    time.sleep(20)
    # 2) 초안 마무리
    o = repl(f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}/videos/short"); await sleep(10000);
const idx = await P.evaluate((k) => [...document.querySelectorAll('ytcp-video-row')].filter(x=>/초안 수정/.test(x.innerText)).findIndex(x=>x.innerText.includes(k)), {J(key)});
if (idx < 0) throw new Error('no draft row for key');
await P.getByText('초안 수정').nth(idx).click(); await sleep(7000);
const ttl = await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #title-textarea')?.innerText || '');
if (!ttl.includes({J(key)})) throw new Error('wrong draft ' + ttl.slice(0,80));
const db = P.locator('#description-textarea #textbox'); const cur = await db.innerText();
if (!cur.startsWith('▶ 전체 답변')) {{ await db.click(); await P.keyboard.press('Meta+A'); await P.keyboard.press('Backspace'); await sleep(400); await P.keyboard.insertText({J(mine)} + "\\n\\n" + cur.trim()); await sleep(1200); }}
const after = await db.innerText(); console.log('DESC', after.startsWith('▶ 전체 답변'), after.includes('pf.kakao.com/_lXVVxb'));
const kids = P.locator('[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'); if ((await kids.getAttribute('aria-checked')) !== 'true') {{ await kids.click(); await sleep(600); }}
await P.locator('#toggle-button').click(); await sleep(1200);
const alt = P.locator('[name="VIDEO_HAS_ALTERED_CONTENT_YES"]'); await alt.scrollIntoViewIfNeeded(); if ((await alt.getAttribute('aria-checked')) !== 'true') {{ await alt.click(); await sleep(600); }}
console.log('ALT', await alt.getAttribute('aria-checked'));
for (let i = 0; i < 6; i++) {{
  if (await P.locator('tp-yt-paper-radio-button[name="UNLISTED"]').isVisible().catch(()=>false)) break;
  const none = P.getByText('해당 사항 없음', {{exact: true}}).first();
  if (await none.isVisible().catch(()=>false)) {{ await none.click(); await sleep(1200); await P.getByText('평가 제출', {{exact: true}}).first().click(); await sleep(3500); }}
  for (let w = 0; w < 15 && (await P.locator('#next-button').getAttribute('aria-disabled')) === 'true'; w++) await sleep(2000);
  await P.locator('#next-button').click(); await sleep(3000);
}}
const un = P.locator('tp-yt-paper-radio-button[name="UNLISTED"]'); await un.click(); await sleep(1200);
console.log('UNLISTED', await un.getAttribute('aria-checked'));
const link = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtube\\.com\\/shorts/.test(h)));
console.log('LINK', link);
await P.locator('#done-button').click(); await sleep(8000);
""")
    m = re.search(r"LINK https://youtube\.com/shorts/([\w-]+)", o)
    print(slug, "finish", " ".join(l for l in o.splitlines() if re.match(r"(DESC|ALT|UNLISTED|LINK)", l)) or o[-300:], flush=True)
    if not m: return
    vid = m.group(1)
    time.sleep(10)
    # 3) 목록에서 공개 상태 확인, 공개면 일부 공개로
    o = repl(f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}/videos/short"); await sleep(10000);
const v = await P.evaluate((k) => {{ const r=[...document.querySelectorAll('ytcp-video-row')].find(x=>x.innerText.includes(k)); if(!r) return 'none'; const t=r.innerText.split('\\n').map(s=>s.trim()).filter(Boolean); return t.find(x=>/^(공개|일부 공개|비공개)$/.test(x)) || 'unknown'; }}, {J(key)});
console.log('VIS', v);
""")
    vis = (re.search(r"VIS (.+)", o) or [None, "?"])[1]
    if vis.strip() == "공개":
        repl(f"""
const P = await openTab("https://studio.youtube.com/video/{vid}/edit"); await sleep(10000);
await P.locator('ytcp-video-metadata-visibility, [id*="visibility"]').first().click(); await sleep(2000);
await P.locator('tp-yt-paper-radio-button[name="UNLISTED"]').click(); await sleep(800);
const d = P.getByRole('button', {{name: '완료'}}).first(); if (await d.isVisible().catch(()=>false)) {{ await d.click(); await sleep(1500); }}
await P.getByRole('button', {{name: '저장'}}).first().click(); await sleep(6000);
""")
        print(slug, "was PUBLIC -> set unlisted", flush=True)
    else:
        print(slug, "visibility", vis, flush=True)
    # 4) 고정 댓글
    o = repl(f"""
const P = await openTab("https://www.youtube.com/watch?v={vid}"); await sleep(9000);
await P.evaluate(() => window.scrollBy(0, 700)); await sleep(4000);
const ph = P.locator('#simplebox-placeholder'); await ph.waitFor({{timeout: 20000}}); await ph.click(); await sleep(1500);
const who = await P.evaluate(() => document.querySelector('ytd-comment-simplebox-renderer img')?.alt || '');
if (!/메이크업포엘|혼주메이크업/.test(who)) throw new Error('not channel: ' + who);
await P.locator('#contenteditable-root').click(); await P.keyboard.insertText({J(pin)}); await sleep(800);
await P.locator('#submit-button').click(); await sleep(6000);
const th = P.locator('ytd-comment-thread-renderer').filter({{hasText: 'honjoo100/{slug}'}}).first();
await th.hover(); await sleep(800); await th.locator('#action-menu button').first().click(); await sleep(1500);
await P.getByText(/^고정$|^Pin$/).first().click(); await sleep(1500);
await P.getByRole('button', {{name: /고정|Pin/}}).last().click(); await sleep(4000);
await P.reload(); await sleep(9000); await P.evaluate(() => window.scrollBy(0, 700)); await sleep(5000);
console.log('FIRST', (await P.evaluate(() => document.querySelector('ytd-comment-thread-renderer')?.innerText.slice(0,60) || '')).replace(/\\s*\\n\\s*/g,' | '));
""")
    print(slug, "pin", (re.search(r"FIRST (.+)", o) or [None, o[-200:]])[1], flush=True)
    json.dump({"slug": slug, "vid": vid, "title": title, "next": nxt, "pin": pin, "vis": vis}, open(S.parent / "uploads" / f"up_{slug}.json", "w"), ensure_ascii=False)

for s in sys.argv[1:]:
    try:
        main(s)
    except Exception as e:
        print(s, "ERROR", e, flush=True)
