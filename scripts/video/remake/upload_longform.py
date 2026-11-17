"""탑20 롱폼 4편 업로드 (2026-11-16 사용자 「롱폼 확인 및 업로드 진행」). 일부 공개로 올린다 — 공개 전환은 사용자가 정한다.

Aside 의 REPL·setFiles 는 실행마다 새로 생기는 세션 폴더(pwd) 밖을 못 읽는다. 200MB 영상을 base64 로 스크립트에
싣기엔 너무 크므로, 한 번의 실행 안에서 pwd 를 찍고 파일이 생길 때까지 기다리게 한 다음 셸이 그 폴더로 하드링크를 건다.

    python3 uplong.py start <편>   # 업로드 시작(제목까지)
    python3 uplong.py finish <편>  # 설명·썸네일·설정·일부 공개
    python3 uplong.py pin <편>     # 고정 댓글
"""
import json, os, re, subprocess, sys, tempfile, time
from pathlib import Path

CH = "UCtlSwebjXpbjnasvIMMTLZA"
J = json.dumps
HERE = Path(__file__).parent
DL = Path.home() / "Downloads/혼주리메이크-롱폼"
SITE = "https://makeupforl.co.kr/honjoo100"
TAG = "?from=yt"
TAIL = "3개월 이용권 55,000원 · 신청 전화 02-323-3321\n그림과 음성은 AI로 만들었습니다."

EP = {
    "image": {
        "file": DL / "C_혼주이미지와뒤꽂이_image_v1.mp4",
        "title": "혼주 뒤꽂이 고르는 법 — 색은 저고리에 맞추고, 하얀 뒤꽂이는 피하세요",
        "desc": ("한복 입으면 다들 단아하게만 하시죠. 화려한 혼주 이미지도 괜찮은지, 머리 장식(뒤꽂이)은 어떤 기준으로 고르는지, 꼭 피해야 할 뒤꽂이 색은 무엇인지 정리했습니다.\n\n"
                 "0:00 오늘 알려 드릴 세 가지\n0:26 1. 혼주마다 이미지가 다릅니다\n1:06 2. 화려함은 품위 안에서\n2:11 3. 뒤꽂이는 뒷모습의 표정\n"
                 "3:34 4. 뒤꽂이 색은 저고리 색에 맞춥니다\n4:41 5. 하얀 뒤꽂이는 피해 주세요\n5:15 정리와 다음 질문\n\n"
                 f"▶ 다음 질문: 양가 혼주 한복 색을 맞춰야 하나요? — 혼주메이크업 100문 100답 P5·02\n   {SITE}/p5-02{TAG}\n"
                 "▶ 이 영상은 채널의 다섯 영상을 하나로 엮었습니다: youtu.be/ZnwOFHbQt8E · youtu.be/iou2gLiXSjk · youtu.be/UxwXHP9rCLA · youtu.be/G58cAbec9nk · youtu.be/1eDBs6EkBpI\n"
                 + TAIL + "\n#혼주메이크업 #혼주한복 #뒤꽂이 #혼주올림머리"),
        "pin": f"뒤꽂이는 꼭 준비해야 할까요? P4·18 · 뒤꽂이 선택 잘하려면 P4·19 — 혼주메이크업 100문 100답\n{SITE}/p4-18{TAG}\n3개월 이용권 55,000원 · 신청 전화 02-323-3321",
    },
    "hanbok": {
        "file": DL / "롱폼A-혼주한복-hanbok_v1.mp4",
        "title": "혼주 한복, 이것만 알면 됩니다 — 저고리 색부터 속옷·귀걸이까지",
        "desc": ("혼주 한복 저고리는 왜 다 똑같은 아이보리색일까요? 한복 색부터 속옷, 악세서리, 귀걸이 고르는 법까지 한 번에 정리했습니다.\n"
                 "혼주 메이크업 전문 메이크업포엘이 많은 혼주님들을 도와드리며 본 것들입니다.\n\n"
                 "0:00 이 영상에서 알려 드리는 세 가지\n0:27 1. 저고리 색 — 왜 다 똑같은 아이보리일까요\n2:09 2. 하얀 저고리가 밋밋할 때 — 치마 색으로\n"
                 "3:11 3. 한복 속옷 — 보이지 않는 곳까지\n4:25 4. 악세서리 세 가지 — 뒤꽂이·진주 귀걸이·반지\n5:30 5. 귀걸이 고르는 법 — 색·얼굴형·귀에 붙는 스타일\n6:44 오늘의 정리와 다음 질문\n\n"
                 f"▶ 다음 질문: 저고리 색이 치마보다 얼굴빛에 더 중요한 이유 — 혼주메이크업 100문 100답 P5·07\n   {SITE}/p5-09{TAG}\n"
                 "▶ 장별로 이어 보기: P5·04 신랑 측 혼주가 더 젊어 보이는 배색 · P6·01 예식 당일 샵에 갈 때 입는 옷 · P4·18 뒤꽂이는 꼭 준비해야 하나요 · P5·09 혼주 한복에 어울리는 안경테\n"
                 "▶ 원본 영상: youtu.be/1RlKXZqrqZc · youtu.be/2MVvY9OBL5o · youtu.be/B5i9l9937uo · youtu.be/835NGcS08Lc · youtu.be/0dhTyQ_p7CM\n"
                 + TAIL + "\n#혼주한복 #혼주메이크업 #혼주귀걸이 #혼주저고리"),
        "pin": f"저고리 색이 치마보다 중요한 이유 P5·07 · 신랑 측 혼주 배색 P5·04 — 혼주메이크업 100문 100답\n{SITE}/p5-09{TAG}\n3개월 이용권 55,000원 · 신청 전화 02-323-3321",
    },
    "prep": {
        "file": DL / "top20-준비와당일_prep_v1.mp4",
        "title": "혼주메이크업 준비 순서 총정리 | 예약 전부터 결혼식 당일 아침까지 체크리스트",
        "desc": ("혼주 메이크업, 언제 무엇을 해야 할까요? 예약 전부터 결혼식 당일 아침까지 준비 순서를 한 번에 정리했습니다.\n\n"
                 "0:00 이 영상에서 얻는 것\n0:28 1. 가장 먼저 할 일 — 사전 컨설팅\n1:38 2. 일주일 전 — 새치 염색\n2:24 3. 전날 저녁과 밤 — 저녁 · 팩 · 머리 · 짐\n"
                 "4:46 4. 결혼식 당일 아침 — 스킨 7번 · 앞단추 옷\n6:09 5. 샵에서 걸리는 시간\n7:21 총정리\n\n"
                 f"▶ 다음 질문: 한복과 양복은 언제 갈아입을까요? — 혼주메이크업 100문 100답 P6·02\n   {SITE}/p6-02{TAG}\n"
                 "▶ 사전 컨설팅 준비 P2·04 · 염색 P4·22 · 샴푸·린스 P4·25 · 아침 스킨케어 P3·07 · 아버지 혼주 P3·22\n"
                 "▶ 원본 영상: youtu.be/aSNWfqI8ffU · youtu.be/VP2L6rFYETc · youtu.be/pXRPh4M1T8A · youtu.be/LB5LoAj2qrc · youtu.be/_UvOY1WkEO4\n"
                 + TAIL + "\n#혼주메이크업 #혼주화장 #결혼식준비 #사전컨설팅"),
        "pin": f"사전 컨설팅은 왜 필수인가 P1·06(무료) · 당일 아침 세안 후 P3·07 — 혼주메이크업 100문 100답\n{SITE}/p1-06{TAG}\n3개월 이용권 55,000원 · 신청 전화 02-323-3321",
    },
    "hair": {
        "file": DL / "hair_v1.mp4",
        "title": "혼주 머리, 결혼식 3주 전부터 당일까지 — 퍼머·염색·가르마·앞머리·올림머리 위치 총정리",
        "desc": ("결혼식 날짜가 잡힌 혼주님을 위한 머리 순서 총정리. 3주 전 퍼머부터 당일 올림머리 위치까지, 순서대로 갑니다.\n\n"
                 "0:00 들어가며\n0:32 퍼머\n1:33 염색과 머리 색\n2:34 앞머리\n4:10 가르마 방향\n5:08 올림머리 위치\n6:56 숏컷과 부분 가발\n7:58 정리와 다음 질문\n\n"
                 f"▶ 더 궁금한 점은 혼주메이크업 100문 100답\n   {SITE}{TAG}\n"
                 "   P4·12 정수리 탈모 · P4·13 정수리 볼륨 · P4·10 앞머리 · P4·09 번 위치 · P4·11 머리 길이 · P5·01 퍼스널 컬러\n"
                 "▶ 원본 영상: 퍼머 youtu.be/MXdwiMqGF2I · 염색 youtu.be/WbpZ_-2CBE4 · 앞머리 youtu.be/E2DOGRjnF-s · 가르마 youtu.be/batExmBLXqU · 올림머리 위치 youtu.be/pC6u6BlUG3Y · 숏컷 youtu.be/DjnMvYjYwK0\n"
                 + TAIL + "\n#혼주헤어 #혼주메이크업 #혼주올림머리 #혼주염색 #혼주퍼머"),
        "pin": f"내 얼굴형 혼주 머리는? 둥근 얼굴 P4·07(무료) · 긴 얼굴 P4·08 / 항암 중·후 P4·26 / 머리색과 가발색 P4·05 — 혼주메이크업 100문 100답\n{SITE}/p4-07{TAG}\n3개월 이용권 55,000원 · 신청 전화 02-323-3321",
    },
}
LOG = HERE / "uplong.json"
TMP = Path.home() / ".aside/u/0/tmp/lf"  # 실행이 끝나도 남고 REPL·setFiles 가 읽을 수 있는 곳


def run(js, timeout=300):
    d = Path(tempfile.mkdtemp()); (d / "s.js").write_text(js)
    r = subprocess.run(["aside", "repl", "--file", str(d / "s.js")], capture_output=True, text=True, timeout=timeout)
    return "\n".join(l for l in (r.stdout + r.stderr).splitlines() if not l.startswith("[system]"))


def run_with_file(js_after, src, name, extra=()):
    """pwd 를 찍고 name 이 생길 때까지 기다리는 실행을 띄운 뒤, 그 pwd 로 src(와 extra 의 (src, name))를 하드링크한다."""
    js = ("console.log('PWD', pwd);\n"
          f"for (let k=0;k<60;k++) {{ try {{ await fs.stat(pwd + '/{name}'); break; }} catch(e) {{ await sleep(1000); }} }}\n" + js_after)
    d = Path(tempfile.mkdtemp()); (d / "s.js").write_text(js); out = d / "out.txt"
    # Aside 가 출력을 끝날 때까지 모아 둘 때가 있어 PWD 줄을 기다리지 않고, 새로 생긴 세션 폴더를 직접 찾는다
    SES = Path.home() / ".aside/u/0/sessions"
    before = set(SES.iterdir())
    p = subprocess.Popen(["aside", "repl", "--file", str(d / "s.js")], stdout=open(out, "w"), stderr=subprocess.STDOUT)
    for _ in range(120):
        new = [x for x in SES.iterdir() if x not in before and x.is_dir()]
        m = re.search(r"^PWD (\S+)", out.read_text(), re.M)
        tgt = Path(m.group(1)) if m else (max(new, key=lambda x: x.stat().st_mtime) if new else None)
        if tgt:
            time.sleep(0.5)
            for a, b in extra:
                os.link(a, tgt / b)
            os.link(src, tgt / name); break
        time.sleep(0.5)
    p.wait(timeout=1500)
    return "\n".join(l for l in out.read_text().splitlines() if not l.startswith("[system]"))


def rec(ep, **kw):
    d = json.loads(LOG.read_text()) if LOG.exists() else {}
    d.setdefault(ep, {}).update(kw); LOG.write_text(json.dumps(d, ensure_ascii=False, indent=1))


def start(ep):
    e = EP[ep]
    js = f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}"); await sleep(9000);
if (!P.url().includes({J(CH)})) throw new Error('wrong channel ' + P.url());
await P.getByRole('button', {{name: '만들기'}}).first().click(); await sleep(1500);
await P.getByText('동영상 업로드').first().click(); await sleep(3000);
const [fc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 20000}}), P.locator('#select-files-button').click()]);
await fc.setFiles(pwd + '/v.mp4');
const tb = P.locator('#title-textarea #textbox'); await tb.waitFor({{timeout: 90000}}); await sleep(3000);
await tb.click(); await P.keyboard.press('Meta+A'); await P.keyboard.insertText({J(e['title'])}); await sleep(2000);
let st = '';
for (let k=0;k<100;k++) {{ st = await P.evaluate(() => document.querySelector('ytcp-uploads-dialog .progress-label, ytcp-video-upload-progress')?.innerText || ''); if (!/업로드 중|Uploading/.test(st)) break; await sleep(2000); }}
console.log('PROGRESS', st.replace(/\\s+/g,' ').slice(0,120));
const link = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtu\\.be\\/|watch\\?v=/.test(h)));
console.log('LINK', link);
await P.locator('#close-button, ytcp-uploads-dialog #close-icon-button').first().click().catch(()=>{{}}); await sleep(2000);
console.log('STARTED');
"""
    o = run_with_file(js, e["file"], "v.mp4")
    m = re.search(r"LINK https?://\S*?(?:youtu\.be/|v=)([\w-]{11})", o)
    print(ep, "start", "STARTED" in o, (m.group(1) if m else None), re.findall(r"PROGRESS.*", o)[-1:] or o[-500:], flush=True)
    if m: rec(ep, vid=m.group(1), title=e["title"])


def upload(ep):
    """업로드 창을 닫지 않고 제목·설명·썸네일·설정·일부 공개·저장까지 한 번에 — 창을 닫으면 초안이 남지 않았다(2026-11-16)."""
    e = EP[ep]
    js = f"""
const P = await openTab("https://studio.youtube.com/channel/{CH}"); await sleep(9000);
if (!P.url().includes({J(CH)}) || /Oops/.test(await P.title())) throw new Error('wrong channel ' + P.url());
const who = await P.evaluate(() => document.querySelector('#entity-name, ytcp-entity-name')?.innerText || ''); console.log('WHO', who);
if (!/혼주메이크업/.test(who)) throw new Error('not 혼주메이크업: ' + who);
try {{
await P.getByRole('button', {{name: '만들기'}}).first().click(); await sleep(1500);
await P.getByText('동영상 업로드').first().click(); await sleep(3000);
const [fc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 20000}}), P.locator('#select-files-button').click()]);
await fc.setFiles(pwd + '/v.mp4');
const tb = P.locator('#title-textarea #textbox'); await tb.waitFor({{timeout: 90000}}); await sleep(3000);
await tb.click(); await P.keyboard.press('Meta+A'); await P.keyboard.insertText({J(e['title'])}); await sleep(1500);
const db = P.locator('#description-textarea #textbox'); await db.click(); await P.keyboard.insertText({J(e['desc'])}); await sleep(1500);
console.log('DESC', (await db.innerText()).slice(0,20));
await sleep(4000); const link = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtu\\.be\\/|watch\\?v=|shorts\\//.test(h)));
console.log('LINK', link);
const tbtn = P.locator('ytcp-uploads-dialog #select-button, ytcp-uploads-dialog ytcp-thumbnail-uploader button, ytcp-uploads-dialog #still-picker button').first();
try {{ const [tc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 15000}}), tbtn.click()]); await tc.setFiles(pwd + '/thumb.jpg'); await sleep(6000); console.log('THUMB set'); }} catch(err) {{ console.log('THUMB fail', String(err).slice(0,120)); }}
const kids = P.locator('[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'); if ((await kids.getAttribute('aria-checked')) !== 'true') {{ await kids.click(); await sleep(600); }}
await P.locator('ytcp-uploads-dialog #toggle-button').first().click(); await sleep(1500);
const alt = P.locator('[name="VIDEO_HAS_ALTERED_CONTENT_YES"]'); await alt.scrollIntoViewIfNeeded(); if ((await alt.getAttribute('aria-checked')) !== 'true') {{ await alt.click(); await sleep(600); }}
console.log('ALT', await alt.getAttribute('aria-checked'));
for (let i = 0; i < 6; i++) {{
  if (await P.locator('tp-yt-paper-radio-button[name="UNLISTED"]').isVisible().catch(()=>false)) break;
  const none = P.getByText('해당 사항 없음', {{exact: true}}).first(); const sub = P.getByText('평가 제출', {{exact: true}}).first();
  if (await none.isVisible().catch(()=>false) && await sub.isVisible().catch(()=>false)) {{
    let ok = await sub.click({{timeout: 3000}}).then(()=>true).catch(()=>false);
    for (let q = 0; q < 2 && !ok; q++) {{ await none.click(); await sleep(1200); ok = await sub.click({{timeout: 3000}}).then(()=>true).catch(()=>false); }}
    await sleep(3500);
  }}
  for (let w = 0; w < 15 && (await P.locator('ytcp-uploads-dialog #next-button').first().getAttribute('aria-disabled')) === 'true'; w++) await sleep(2000);
  console.log('STEP', i, (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || '')).replace(/\\s+/g,' ').slice(0,60));
  console.log('NB', JSON.stringify(await P.evaluate(() => [...document.querySelectorAll('#next-button')].map(b => [b.closest('ytcp-uploads-dialog') ? 'dlg' : 'other', b.getAttribute('aria-disabled'), b.offsetParent !== null]))));
  const ok = await P.locator('ytcp-uploads-dialog #next-button').first().click({{timeout: 8000}}).then(()=>true).catch(()=>false);
  if (!ok) {{ await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #next-button')?.click()); console.log('NEXT js'); }}
  await sleep(3500);
}}
const pb = P.locator('tp-yt-paper-radio-button[name="UNLISTED"]'); await pb.click(); await sleep(1200);
console.log('UNLISTED', await pb.getAttribute('aria-checked'));
for (let k=0;k<300;k++) {{ const st = await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || ''); if (!/업로드 중|Uploading|남은 시간/.test(st)) break; await sleep(3000); }}
const link2 = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtu\\.be\\/|watch\\?v=/.test(h)));
console.log('LINK2', link2);
for (let k = 0; k < 3; k++) {{
  const cl = P.locator('ytcp-uploads-dialog').getByText('닫기', {{exact: true}}); if (await cl.count()) {{ await cl.first().click().catch(()=>{{}}); await sleep(1500); }}
  await P.locator('#done-button').click(); await sleep(8000);
  if (!(await P.locator('ytcp-uploads-dialog #done-button').isVisible().catch(()=>false))) break;
}}
console.log('SAVED');
}} catch (err) {{
  console.log('FAIL', String(err).slice(0,300), '| URL', P.url());
  await P.screenshot({{path: pwd + '/fail.png'}}).catch(()=>{{}});
  console.log('DLG', (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || '')).replace(/\\s+/g,' ').slice(0,900));
}}
"""
    o = run_with_file(js, e["file"], "v.mp4", extra=[(HERE / f"thumb_{ep}.jpg", "thumb.jpg")])
    m = re.search(r"LINK2? https?://\S*?(?:youtu\.be/|v=)([\w-]{11})", o)
    print(ep, "upload", " | ".join(l for l in o.splitlines() if re.match(r"(WHO|DESC|LINK|THUMB|ALT|STEP|NB|NEXT|UNLISTED|SAVED|FAIL|Error)", l)) or o[-600:], flush=True)
    if m: rec(ep, vid=m.group(1), title=e["title"])


def finish(ep):
    e = EP[ep]; vid = json.loads(LOG.read_text())[ep]["vid"]
    js = f"""
const P = await openTab("https://studio.youtube.com/video/{vid}/edit"); await sleep(12000);
const t = await P.locator('#title-textarea #textbox').innerText(); console.log('TITLE', t.slice(0,40));
const db = P.locator('#description-textarea #textbox'); await db.click(); await P.keyboard.press('Meta+A'); await P.keyboard.press('Backspace'); await sleep(400);
await P.keyboard.insertText({J(e['desc'])}); await sleep(1200);
console.log('DESC', (await db.innerText()).slice(0,20));
const [fc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 15000}}), P.locator('#still-picker #upload-button, ytcp-thumbnail-uploader #select-button, ytcp-thumbnails-compact-editor-uploader button').first().click()]);
await fc.setFiles(pwd + '/thumb.jpg'); await sleep(6000); console.log('THUMB set');
const kids = P.locator('[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'); if ((await kids.getAttribute('aria-checked')) !== 'true') {{ await kids.click(); await sleep(600); }}
await P.locator('#toggle-button').first().click().catch(()=>{{}}); await sleep(1500);
const alt = P.locator('[name="VIDEO_HAS_ALTERED_CONTENT_YES"]'); await alt.scrollIntoViewIfNeeded(); if ((await alt.getAttribute('aria-checked')) !== 'true') {{ await alt.click(); await sleep(600); }}
console.log('ALT', await alt.getAttribute('aria-checked'));
await P.locator('ytcp-video-metadata-visibility').first().click(); await sleep(2000);
await P.locator('tp-yt-paper-radio-button[name="UNLISTED"]').click(); await sleep(800);
const d = P.getByRole('button', {{name: '완료'}}).first(); if (await d.isVisible().catch(()=>false)) {{ await d.click(); await sleep(1500); }}
await P.getByRole('button', {{name: '저장'}}).first().click(); await sleep(8000);
await P.reload(); await sleep(12000);
console.log('VIS', (await P.locator('ytcp-video-metadata-visibility').first().innerText()).replace(/\\s+/g,' '));
console.log('DESC2', (await P.locator('#description-textarea #textbox').innerText()).slice(0,30));
"""
    o = run_with_file(js, HERE / f"thumb_{ep}.jpg", "thumb.jpg")
    print(ep, "finish", " | ".join(l for l in o.splitlines() if re.match(r"(TITLE|DESC|THUMB|ALT|VIS|Error)", l)) or o[-600:], flush=True)
    vis = re.search(r"VIS (.*)", o)
    rec(ep, vis=vis.group(1) if vis else None)


def pin(ep):
    e = EP[ep]; vid = json.loads(LOG.read_text())[ep]["vid"]
    o = run(f"""
const P = await openTab("https://www.youtube.com/watch?v={vid}"); await sleep(9000);
await P.evaluate(() => window.scrollBy(0, 700)); await sleep(4000);
const ph = P.locator('#simplebox-placeholder'); await ph.waitFor({{timeout: 20000}}); await ph.click(); await sleep(1500);
const who = await P.evaluate(() => document.querySelector('ytd-comment-simplebox-renderer img')?.alt || '');
if (!/메이크업포엘|혼주메이크업/.test(who)) throw new Error('not channel: ' + who);
await P.locator('#contenteditable-root').click(); await P.keyboard.insertText({J(e['pin'])}); await sleep(800);
await P.locator('#submit-button').click(); await sleep(6000);
const th = P.locator('ytd-comment-thread-renderer').filter({{hasText: '100문 100답'}}).first();
await th.hover(); await sleep(800); await th.locator('#action-menu button').first().click(); await sleep(1500);
await P.getByText(/^고정$|^Pin$/).first().click(); await sleep(1500);
await P.getByRole('button', {{name: /고정|Pin/}}).last().click(); await sleep(4000);
console.log('PINNED');
""")
    print(ep, "pin", "PINNED" in o, "" if "PINNED" in o else o[-400:], flush=True)
    rec(ep, pin="PINNED" in o)




# ── 120초 제한 때문에 쪼갠 업로드 (2026-11-16) ──────────────────────────────
# aside repl 한 번은 120초에서 끊긴다. 탭은 남으므로 단계마다 업로드 창이 열린 탭에 다시 붙는다.
ATT = """{
let P = null;
for (const t of (await listBrowserTabs()).filter(t => /studio\\.youtube\\.com/.test(t.url))) {
  const Q = await attachBrowserTab(t.targetId || t.id);
  if (await Q.evaluate(() => !!document.querySelector('ytcp-uploads-dialog #title-textarea'))) { P = Q; break; }
}
if (!P) throw new Error('no upload dialog');
"""


def step(js, label, timeout=150):
    o = run(ATT + js + "\n}", timeout)
    keep = [l for l in o.splitlines() if re.match(r"(OK|LINK|ST|PROG|UNL|THUMB|ALT|DESC|SAVED|Error|FAIL)", l)]
    print("  ", label, " | ".join(keep)[:400] or o[-300:], flush=True)
    return o


def upload2(ep):
    e = EP[ep]
    # 1) 파일 넣고 제목까지
    o = run_with_file(f"""{{
const P = await openTab("https://studio.youtube.com/channel/{CH}"); await sleep(8000);
const who = await P.evaluate(() => document.querySelector('#entity-name, ytcp-entity-name')?.innerText || '');
if (!/혼주메이크업/.test(who)) throw new Error('not 혼주메이크업: ' + who + ' ' + P.url());
await P.getByRole('button', {{name: '만들기'}}).first().click(); await sleep(1500);
await P.getByText('동영상 업로드').first().click(); await sleep(3000);
const [fc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 20000}}), P.locator('#select-files-button').click()]);
await fc.setFiles(pwd + '/v.mp4');
const tb = P.locator('#title-textarea #textbox'); await tb.waitFor({{timeout: 40000}}); await sleep(2000);
await tb.click(); await P.keyboard.press('Meta+A'); await P.keyboard.insertText({J(e['title'])}); await sleep(1500);
console.log('OK title');
for (let k = 0; k < 40; k++) {{ const st = (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || '')).replace(/\\s+/g,' '); if (!/업로드 중|남은 시간|Uploading/.test(st)) {{ console.log('OK uploaded'); break; }} await sleep(2000); }}
}}""", e["file"], "v.mp4")
    print("  1 title", " | ".join(l for l in o.splitlines() if re.match(r"(OK|Error)", l))[:300], flush=True)
    if "OK uploaded" not in o: return
    # 2) 설명 + 썸네일 (썸네일 파일이 필요해 run_with_file)
    o = run_with_file(ATT + f"""
const db = P.locator('#description-textarea #textbox'); await db.click(); await P.keyboard.press('Meta+A'); await P.keyboard.press('Backspace'); await P.keyboard.insertText({J(e['desc'])}); await sleep(1200);
console.log('DESC', (await db.innerText()).slice(0,15));
const tbtn = P.locator('ytcp-uploads-dialog #select-button, ytcp-uploads-dialog ytcp-thumbnail-uploader button, ytcp-uploads-dialog #still-picker button').first();
try {{ const [tc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 15000}}), tbtn.click()]); await tc.setFiles(pwd + '/thumb.jpg'); await sleep(5000); console.log('THUMB set'); }} catch(err) {{ console.log('THUMB fail', String(err).slice(0,120)); }}
const link = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtu\\.be\\/|watch\\?v=/.test(h)));
console.log('LINK', link);
}}""", TMP / f"thumb_{ep}_a.jpg", "thumb.jpg")
    print("  2 desc", " | ".join(l for l in o.splitlines() if re.match(r"(DESC|THUMB|LINK|Error)", l))[:300], flush=True)
    # 3) 아동용 아님 · 변경된 콘텐츠
    step("""
const kids = P.locator('[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]'); if ((await kids.getAttribute('aria-checked')) !== 'true') { await kids.click(); await sleep(600); }
await P.locator('ytcp-uploads-dialog #toggle-button').first().click(); await sleep(1500);
const alt = P.locator('[name="VIDEO_HAS_ALTERED_CONTENT_YES"]'); await alt.scrollIntoViewIfNeeded(); if ((await alt.getAttribute('aria-checked')) !== 'true') { await alt.click(); await sleep(600); }
console.log('ALT', await alt.getAttribute('aria-checked'));
""", "3 settings")
    # 4) 다음 단계들 — 한 번에 한 단계씩
    for i in range(6):
        o = step("""
const txt = (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || '')).replace(/\\s+/g,' ');
if (await P.locator('tp-yt-paper-radio-button[name="UNLISTED"]').isVisible().catch(()=>false)) { console.log('ST visibility'); }
else {
  const none = P.getByText('해당 사항 없음', {exact: true}).first(); const sub = P.getByText('평가 제출', {exact: true}).first();
  if (await none.isVisible().catch(()=>false) && await sub.isVisible().catch(()=>false)) {
    let ok = await sub.click({timeout: 3000}).then(()=>true).catch(()=>false);
    for (let q = 0; q < 2 && !ok; q++) { await none.click(); await sleep(1200); ok = await sub.click({timeout: 3000}).then(()=>true).catch(()=>false); }
    await sleep(3000);
  }
  for (let w = 0; w < 10 && (await P.locator('ytcp-uploads-dialog #next-button').first().getAttribute('aria-disabled')) === 'true'; w++) await sleep(2000);
  const ok2 = await P.locator('ytcp-uploads-dialog #next-button').first().click({timeout: 8000}).then(()=>true).catch(()=>false);
  if (!ok2) await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #next-button')?.click());
  await sleep(3000);
  console.log('ST next', ok2 ? 'click' : 'js', txt.slice(0, 50));
}
""", f"4 step{i}")
        if "ST visibility" in o: break
    # 5) 일부 공개
    step("""
const pb = P.locator('tp-yt-paper-radio-button[name="UNLISTED"]'); await pb.click(); await sleep(1200);
console.log('UNL', await pb.getAttribute('aria-checked'));
""", "5 unlisted")
    # 6) 업로드가 끝날 때까지 기다렸다가 저장
    for k in range(15):
        o = step("""
const st = (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || '')).replace(/\\s+/g,' ');
console.log('PROG', (st.match(/(업로드 중[^.]*|업로드 완료[^.]*|처리 중[^.]*)/) || [''])[0].slice(0,60));
console.log('ST', /업로드 중|남은 시간/.test(st) ? 'uploading' : 'ready');
""", f"6 wait{k}")
        if "ST ready" in o: break
        time.sleep(20)
    o = step("""
const link2 = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtu\\.be\\/|watch\\?v=/.test(h)));
console.log('LINK', link2);
for (let k = 0; k < 3; k++) {
  const cl = P.locator('ytcp-uploads-dialog').getByText('닫기', {exact: true}); if (await cl.count()) { await cl.first().click().catch(()=>{}); await sleep(1500); }
  await P.locator('ytcp-uploads-dialog #done-button').click({timeout: 8000}).catch(()=>{}); await sleep(7000);
  if (!(await P.locator('ytcp-uploads-dialog #done-button').isVisible().catch(()=>false))) break;
}
console.log('SAVED');
""", "7 save")
    m = re.search(r"LINK https?://\S*?(?:youtu\.be/|v=)([\w-]{11})", o)
    if m: rec(ep, vid=m.group(1), title=e["title"]); print(ep, "VID", m.group(1), flush=True)




def fast(ep):
    """120초 안에 업로드부터 저장까지 한 번에. 업로드 창은 ?d=ud 로 바로 연다."""
    e = EP[ep]
    js = f"""{{
const T0 = Date.now(); const el = () => Math.round((Date.now()-T0)/1000);
const P = await openTab("https://studio.youtube.com/channel/{CH}/videos/upload?d=ud"); await sleep(6000);
const who = await P.evaluate(() => document.querySelector('#entity-name, ytcp-entity-name')?.innerText || document.title);
console.log('OK who', who, el());
const [fc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 20000}}), P.locator('#select-files-button').click()]);
await fc.setFiles(pwd + '/v.mp4');
const tb = P.locator('#title-textarea #textbox'); await tb.waitFor({{timeout: 30000}}); await sleep(1500);
await tb.click(); await P.keyboard.press('Meta+A'); await P.keyboard.insertText({J(e['title'])});
const db = P.locator('#description-textarea #textbox'); await db.click(); await P.keyboard.insertText({J(e['desc'])}); await sleep(500);
console.log('OK text', el());
try {{ const [tc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 8000}}), P.locator('ytcp-uploads-dialog #select-button, ytcp-uploads-dialog ytcp-thumbnail-uploader button, ytcp-uploads-dialog #still-picker button').first().click()]); await tc.setFiles(pwd + '/thumb.jpg'); await sleep(2500); console.log('OK thumb', el()); }} catch(err) {{ console.log('OK thumbfail', String(err).slice(0,80)); }}
const ov = await P.evaluate(() => [...document.querySelectorAll('tp-yt-paper-dialog, ytcp-dialog')].filter(e => e.offsetParent !== null && !e.closest('ytcp-uploads-dialog')).map(e => (e.innerText||'').replace(/\\s+/g,' ').slice(0,100)));
console.log('OK overlay', JSON.stringify(ov));
await P.evaluate(() => document.querySelector('[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]')?.click()); await sleep(300);
await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #toggle-button')?.click()); await sleep(1000);
await P.evaluate(() => document.querySelector('[name="VIDEO_HAS_ALTERED_CONTENT_YES"]')?.click()); await sleep(300);
console.log('OK alt', await P.locator('[name="VIDEO_HAS_ALTERED_CONTENT_YES"]').getAttribute('aria-checked'), await P.locator('[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').getAttribute('aria-checked'), el());
const link = await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog a')].map(a=>a.href).find(h=>/youtu\\.be\\/|watch\\?v=/.test(h)));
console.log('LINK', link);
for (let i = 0; i < 7; i++) {{
  if (await P.locator('tp-yt-paper-radio-button[name="UNLISTED"]').isVisible().catch(()=>false)) break;
  const none = P.getByText('해당 사항 없음', {{exact: true}}).first(); const sub = P.getByText('평가 제출', {{exact: true}}).first();
  if (await none.isVisible().catch(()=>false) && await sub.isVisible().catch(()=>false)) {{ let ok = await sub.click({{timeout: 2000}}).then(()=>true).catch(()=>false); if (!ok) {{ await none.click(); await sleep(800); await sub.click({{timeout: 2000}}).catch(()=>{{}}); }} await sleep(2000); }}
  const t = (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || '')).replace(/\\s+/g,' ');
  const info = await P.evaluate(() => {{ const d = document.querySelector('ytcp-uploads-dialog'); const steps = [...d.querySelectorAll('button[role=tab], ytcp-stepper [role=tab], .step')].map(b => (b.innerText||'').trim().slice(0,8) + ':' + (b.getAttribute('aria-selected')||b.getAttribute('state')||'')); const nb = d.querySelector('#next-button'); const main = (d.querySelector('ytcp-uploads-details, ytcp-uploads-monetization, ytcp-uploads-video-elements, ytcp-uploads-review, #scrollable-content, .content') || d).innerText.replace(/\\s+/g,' '); return [steps.join(','), nb && nb.getAttribute('aria-disabled'), main.slice(0,300)]; }});
  console.log('OK step', i, el(), JSON.stringify(info));
  if (/수익 창출:true/.test(info[0]) && info[1] === 'true') {{
    // 광고 켜기 — 사용자 결정(2026-11-16 「광고는 켜야한다」)
    const m = P.locator('ytcp-uploads-dialog ytcp-uploads-monetization, ytcp-uploads-dialog [class*=monetiz]').first();
    const opener = m.getByText('선택', {{exact: true}}).first();
    await opener.click({{timeout: 4000}}).catch(async () => {{ await P.evaluate(() => [...document.querySelectorAll('ytcp-uploads-dialog *')].find(e => e.children.length === 0 && e.innerText?.trim() === '선택')?.click()); }});
    await sleep(1200);
    const opts = await P.evaluate(() => [...document.querySelectorAll('tp-yt-paper-radio-button, tp-yt-paper-item, [role=option], [role=menuitemradio], ytcp-ve tp-yt-paper-radio-button')].filter(e => e.offsetParent !== null).map(e => (e.getAttribute('name')||'') + '=' + (e.innerText||'').trim().slice(0,20)));
    console.log('OK opts', JSON.stringify(opts));
    const on = await P.evaluate(() => {{ const el = [...document.querySelectorAll('tp-yt-paper-radio-button, tp-yt-paper-item, [role=option], [role=menuitemradio]')].filter(e => e.offsetParent !== null).find(e => /^(사용|켜기|On|ON)$/.test((e.innerText||'').trim()) || e.getAttribute('name') === 'ON'); if (el) {{ el.click(); return (el.innerText||'').trim() || el.getAttribute('name'); }} return null; }});
    console.log('OK on', on); await sleep(800);
    await P.evaluate(() => [...document.querySelectorAll('ytcp-button, button')].filter(b => b.offsetParent !== null).find(b => /^(완료|Done)$/.test((b.innerText||'').trim()) && !b.closest('#done-button') && b.id !== 'done-button')?.click()); await sleep(1500);
    console.log('OK monet', (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #next-button')?.getAttribute('aria-disabled'))), el());
  }}
  await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #next-button')?.click()); await sleep(2500);
}}
await P.evaluate(() => document.querySelector('tp-yt-paper-radio-button[name="UNLISTED"]')?.click()); await sleep(800);
console.log('OK unl', await P.locator('tp-yt-paper-radio-button[name="UNLISTED"]').getAttribute('aria-checked'));
console.log('OK unlisted', el());
for (let k = 0; k < 60 && el() < 100; k++) {{ const st = (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || '')).replace(/\\s+/g,' '); if (!/업로드 중|남은 시간|Uploading/.test(st)) {{ console.log('OK uploaded', el()); break; }} await sleep(1500); }}
await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #done-button')?.click()); await sleep(5000);
const cl = P.locator('ytcp-uploads-dialog').getByText('닫기', {{exact: true}}); if (await cl.count()) {{ await cl.first().click().catch(()=>{{}}); await sleep(1000); await P.evaluate(() => document.querySelector('ytcp-uploads-dialog #done-button')?.click()); await sleep(4000); }}
console.log('OK saved', el(), (await P.evaluate(() => document.querySelector('ytcp-uploads-dialog')?.innerText || 'closed')).replace(/\\s+/g,' ').slice(0,80));
}}"""
    o = run_with_file(js, e["file"], "v.mp4", extra=[(TMP / f"thumb_{ep}_a.jpg", "thumb.jpg")])
    print(ep, "fast", " | ".join(l for l in o.splitlines() if re.match(r"(OK|LINK|Error|PWD)", l))[:2500], flush=True)
    m = re.search(r"LINK https?://\S*?(?:youtu\.be/|v=)([\w-]{11})", o)
    if m: rec(ep, vid=m.group(1), title=e["title"])




def ab(ep):
    """수정 화면: 설명란 갈아 끼우기 + 썸네일 A/B(b·c 추가) + 저장. 기본 설명이 섞이는 것을 여기서 바로잡는다."""
    e = EP[ep]; vid = json.loads(LOG.read_text())[ep]["vid"]
    js = f"""{{
const T0 = Date.now(); const el = () => Math.round((Date.now()-T0)/1000);
const E = await openTab("https://studio.youtube.com/video/{vid}/edit"); await sleep(10000);
const db = E.locator('#description-textarea #textbox'); await db.click(); await E.keyboard.press('Meta+A'); await E.keyboard.press('Backspace'); await sleep(300);
await E.keyboard.insertText({J(e['desc'])}); await sleep(800);
console.log('OK desc', (await db.innerText()).slice(0,20), el());
await E.getByText('A/B 테스팅', {{exact: true}}).first().click(); await sleep(2500);
const D = E.locator('ytcp-dialog').filter({{hasText: '테스트하고 비교'}}).first();
await D.getByText('썸네일만', {{exact: true}}).first().click(); await sleep(1500);
for (const [lab, f] of [['썸네일 2 업로드', 'b.jpg'], ['썸네일 3 업로드', 'c.jpg']]) {{
  try {{ const [fc] = await Promise.all([E.waitForEvent('filechooser', {{timeout: 10000}}), D.locator('[aria-label="' + lab + '"]').first().click()]); await fc.setFiles(pwd + '/' + f); await sleep(4000); console.log('OK thumb', lab, el()); }}
  catch (err) {{ console.log('OK thumbfail', lab, String(err).slice(0,100)); }}
}}
await D.locator('#set-test-button').first().click({{timeout: 8000}}).catch(async () => {{ await E.evaluate(() => [...document.querySelectorAll('ytcp-dialog #set-test-button')].find(b=>b.offsetParent!==null)?.click()); }});
await sleep(3000);
console.log('OK settest', el(), JSON.stringify(await E.evaluate(() => [...document.querySelectorAll('ytcp-dialog')].filter(x=>x.offsetParent!==null).map(x=>(x.innerText||'').replace(/\\s+/g,' ').slice(0,120)))));
await E.evaluate(() => document.querySelector('ytcp-button#save, #save-button, ytcp-button[id=save]')?.click()); await sleep(1000);
const sv = E.getByRole('button', {{name: '저장'}}).first(); if (await sv.isVisible().catch(()=>false)) await sv.click().catch(()=>{{}});
await sleep(6000);
console.log('OK saved', el());
}}"""
    o = run_with_file(js, TMP / f"thumb_{ep}_b.jpg", "b.jpg", extra=[(TMP / f"thumb_{ep}_c.jpg", "c.jpg")])
    print(ep, "ab", " | ".join(l for l in o.splitlines() if re.match(r"(OK|Error)", l))[:1500], flush=True)


if __name__ == "__main__":
    fn = globals()[sys.argv[1]]
    for ep in sys.argv[2:]:
        try:
            fn(ep)
        except Exception as ex:
            print(ep, "ERROR", ex, flush=True)
