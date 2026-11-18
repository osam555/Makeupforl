#!/usr/bin/env python3
"""Google Flow 조작 (aside repl) — 꼬리판 쇼츠 그림·클립 만들기 (2026-11-10).

`aside exec` 는 Aside 크레딧 부족(402)이라 쓰지 않는다. `aside repl` 은 호출마다 새 세션이고 120초 제한이라
한 호출 안에서 열기·조작·확인을 끝낸다. 생성은 탭을 닫아도 서버에서 계속된다.

    python3 newtake/flow.py new    <spec.json>                 # 새 프로젝트(이름 = spec id) → spec 의 flow_project
    python3 newtake/flow.py upload <spec.json> <file> <name>   # 파일을 <name> 으로 올린다 (참조·시작 프레임용)
    python3 newtake/flow.py img    <spec.json> <N> [--ref NAME]  # N줄 그림 생성·완료 대기·원본 크기로 받기 → <sources[0]>/img-NN.jpg
    python3 newtake/flow.py clip   <spec.json> <N>             # N줄 그림을 L{N}-start.jpg 로 올려 시작 프레임으로 Veo 3.1 Fast 9:16 8초 (10크레딧 넘으면 멈춤)
    python3 newtake/flow.py dl     <spec.json> <out> [--index 0]  # 맨 앞(최신) 타일을 원본 크기로 받기
    python3 newtake/flow.py wait   <spec.json>                 # 맨 앞 타일이 끝날 때까지(%가 사라질 때까지) 기다림

그림은 한 장씩 차례로 만든다 — 끝난 타일은 Flow 가 자동 제목으로 이름을 바꿔 이름으로 찾을 수 없어서, 늘 맨 앞(최신) 타일을 받는다.
"""
import base64, json, re, shutil, subprocess, sys, tempfile, time
from pathlib import Path

NT = Path(__file__).resolve().parent
HERE = NT.parent
ROOT = NT.parents[2]  # 저장소 뿌리 — spec 의 sources 가 상대경로면 여기 기준
DL = Path.home() / "Downloads"
J = json.dumps


def load(spec_path):
    p = Path(spec_path)
    if not p.is_absolute():
        p = (HERE / p) if (HERE / p).exists() else Path.cwd() / p
    return p, json.load(open(p, encoding="utf-8"))


def repl(js, timeout=170):
    d = Path(tempfile.mkdtemp(prefix="flowrepl-"))
    f = d / "s.js"; f.write_text(js, encoding="utf-8")
    r = subprocess.run(["aside", "repl", "--file", str(f)], capture_output=True, text=True, timeout=timeout)
    out = "\n".join(l for l in (r.stdout + r.stderr).splitlines() if not l.startswith("[system]"))
    shutil.rmtree(d, ignore_errors=True)
    return out


OPEN = """
const P = await openTab(%s);
await sleep(11000);
async function radio(n) { for (let t = 0; t < 3; t++) {
  const s0 = await snapshot(P, {interactive: true}); const line = s0.tree.split('\\n').find(l => l.includes('radio "' + n + '"'));
  if (line && line.includes('[checked]')) return true;
  const rf = line && (line.match(/\\[ref=(e\\d+)\\]/) || [])[1];
  if (rf) { try { await P.locator(rf).click(); } catch (e) {} } await sleep(1500);
  const sr = await snapshot(P, {interactive: true}); if (sr.tree.split('\\n').some(l => l.includes('radio "' + n + '"') && l.includes('[checked]'))) return true; } console.log('RADIO FAIL', n); return false; }
async function firstGroup() { const s = await snapshot(P, {selector: 'main'}); const m = s.tree.match(/group "([^"]*)":[\\s\\S]*?(?=\\n    - group |$)/); return m ? m[0] : ''; }
async function waitDone(maxS) { for (let k = 0; k < maxS / 5; k++) { await sleep(5000); const g = await firstGroup(); if (g && !/\\d%%/.test(g) && !/Generating|Queued|Starting/i.test(g)) { if (/fail|error|unusual|couldn.t|try again/i.test(g)) { console.log('FAILED', JSON.stringify(g.slice(0, 300))); return false; } return true; } } return false; }
async function download(idx) {
  const s0 = await snapshot(P, {interactive: true, selector: 'main'});
  const blocks = s0.tree.split(/\\n(?=\\s*- group )/).filter(b => /^\\s*- group /.test(b));
  const bref = (blocks[idx].match(/button [^\\n]*\\[ref=(e\\d+)\\]/) || [])[1];
  let b1 = '', mref = null;
  for (let t = 0; t < 4 && !mref; t++) {
    await P.locator(bref).hover(); await sleep(2500);
    const s1 = await snapshot(P, {interactive: true, selector: 'main'});
    b1 = s1.tree.split(/\\n(?=\\s*- group )/).filter(b => /^\\s*- group /.test(b))[idx];
    mref = (b1.match(/button "More options" \\[ref=(e\\d+)\\]/) || [])[1];
  }
  if (!mref) { console.log('NOMENU', b1.slice(0, 400)); throw new Error('no menu'); }
  await P.locator(mref).click(); await sleep(1000);
  await P.getByRole('menuitem', {name: 'Download'}).click(); await sleep(1000);
  const [dx] = await Promise.all([P.waitForEvent('download', {timeout: 60000}), P.getByRole('menuitem', {name: /Original size/}).first().click()]);
  await dx.saveAs(pwd + '/out.bin');
  console.log('TILE', (b1.match(/group "([^"]*)"/) || [])[1]);
  console.log('SAVED', dx.suggestedFilename());
}
"""


def _norm(t):
    return re.sub(r"[^0-9a-z]", "", t.lower())


def fetch_saved(out, dst):
    """받은 파일이 그 타일의 것인지 확인한다 — 여러 세션이 동시에 받으면 download 이벤트가 남의 탭 것을 잡는다(2026-11-10 감⑤·⑥).
    Flow 의 파일 이름은 「<타일 제목>_<해시>.<확장자>」라 제목 앞부분과 확장자를 맞춰 본다."""
    m = re.search(r"^SAVED (.+)$", out, re.M)
    if not m:
        return False
    name = m.group(1).strip()
    tile = (re.search(r"^TILE (.*)$", out, re.M) or [None, ""])[1].strip()
    if Path(name).suffix.lower() != dst.suffix.lower() and not (dst.suffix == ".jpg" and Path(name).suffix.lower() in (".jpeg", ".png")):
        print(f"✖ 받은 파일 형식이 다르다: {name} (기대 {dst.suffix}) — 다른 세션의 다운로드를 잡은 듯")
        return False
    if tile and _norm(tile)[:12] and not _norm(name).startswith(_norm(tile)[:12]):
        print(f"✖ 받은 파일이 타일과 다르다: 타일 「{tile}」 / 파일 {name} — 다른 세션의 다운로드를 잡은 듯")
        return False
    src = DL / name
    for _ in range(20):
        if src.exists() and src.stat().st_size > 0:
            break
        time.sleep(1)
    if not src.exists():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dst)
    return True


def prompt_img(spec, ln, ref):
    pre = ("Use the reference image for the exact same woman, hanbok colors, hairstyle, hair ornament and art style; draw a new shot of the same scene. Her face must never be visible. "
           if ref else "")
    return (pre + "ONE single continuous scene, one camera, one sky, never split into panels, no seams. "
            + ln["img"] + " " + spec["img_style"] + " " + spec["banned"])


def cmd_new(sp, spec):
    js = OPEN % J("https://flow.google.com/") + f"""
await P.getByRole('button', {{name: 'New project'}}).click(); await sleep(5000);
const t = P.getByRole('textbox', {{name: 'Editable text'}}); await t.click(); await t.fill({J(spec['id'] + '-practice')}); await t.press('Enter'); await sleep(1500);
console.log('URL', P.url());
"""
    out = repl(js)
    m = re.search(r"^URL (https://flow\.google\.com/project/[0-9a-f-]+)", out, re.M)
    if not m:
        sys.exit(out)
    spec["flow_project"] = m.group(1)
    json.dump(spec, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("project", m.group(1))


def cmd_upload(sp, spec, file, name):
    b64 = base64.b64encode(Path(file).read_bytes()).decode()
    js = OPEN % J(spec["flow_project"]) + f"""
await fs.writeFile(pwd + '/' + {J(name)}, Buffer.from({J(b64)}, 'base64'));
await P.getByRole('button', {{name: 'Add media menu'}}).click(); await sleep(1000);
const sm = await snapshot(P, {{interactive: true}}); console.log((sm.diff || '').slice(0, 1500));
const [fc] = await Promise.all([P.waitForEvent('filechooser', {{timeout: 15000}}), P.getByRole('menuitem', {{name: /Upload/i}}).first().click()]);
await fc.setFiles(pwd + '/' + {J(name)});
for (let k = 0; k < 20; k++) {{ await sleep(3000); const s = await snapshot(P, {{selector: 'main'}}); if (s.tree.includes('group "' + {J(name)} + '"') && !/\\d%/.test(await firstGroup())) {{ console.log('UPLOADED', {J(name)}); break; }} }}
"""
    out = repl(js)
    ok = "UPLOADED" in out
    print(("ok " if ok else "✖ ") + name + ("" if ok else "\n" + out[-2500:]))
    return ok


def cmd_img(sp, spec, n, ref=None, out_dir=None):
    ln = spec["lines"][n - 1]
    dst = (ROOT / (out_dir or spec["sources"][0])) / f"img-{n:02d}.jpg"
    p = prompt_img(spec, ln, ref)
    refjs = ""
    if ref:
        refjs = f"""
await P.getByRole('button', {{name: 'Add ingredients to the prompt box'}}).click(); await sleep(1500);
await P.getByRole('option', {{name: new RegExp({J(re.escape(ref))})}}).first().click(); await sleep(800);
const ab = P.getByRole('button', {{name: 'Add to prompt'}}); if (await ab.count()) {{ await ab.click(); await sleep(800); }}
const ing = await P.evaluate(() => [...document.querySelectorAll('img')].filter(i => /Ingredient/i.test(i.alt)).length);
console.log('ING', ing); if (ing !== 1) {{ console.log('ABORT ingredient count', ing); throw new Error('ingredient'); }}
"""
    js = OPEN % J(spec["flow_project"]) + f"""
const clr = P.getByRole('button', {{name: 'Clear prompt'}}); if (await clr.count()) {{ await clr.click(); await sleep(800); }}
await P.getByRole('button', {{name: 'Settings trigger'}}).click(); await sleep(2500);
await radio('Image'); await radio('9:16'); await radio('x1');
const sc = await snapshot(P); const cr = (sc.tree.match(/link "([0-9]+) credits?"/) || [])[1] ?? ((await P.evaluate(() => document.body.innerText)).match(/will use ([0-9]+) credits?/) || [])[1];
const trig = (sc.tree.match(/Settings trigger[^\\n]*/) || [''])[0];
console.log('SET', trig, 'credits', cr);
await P.keyboard.press('Escape'); await sleep(500);
if (cr !== '0' || !/Nano Banana/.test(trig)) {{ console.log('ABORT image settings'); throw new Error('settings'); }}
{refjs}
await P.getByRole('textbox', {{name: 'What do you want to create?'}}).fill({J(p)});
await sleep(700);
await P.getByRole('button', {{name: 'Start generation'}}).click();
await sleep(4000);
const ok = await waitDone(95);
if (ok) {{ await sleep(1500); await download(0); }} else console.log('NOTDONE');
"""
    out = repl(js)
    if "SAVED" in out and fetch_saved(out, dst):
        print("ok", dst)
        return True
    if "SAVED" in out or "TILE" in out:                   # 생성은 끝났는데 받은 파일이 틀림 → 맨 앞 타일을 다시 받는다
        return cmd_dl(sp, spec, dst, 0)
    print("✖ img", n, "\n" + out[-2500:])
    return False


def cmd_wait(sp, spec, max_s=110):
    js = OPEN % J(spec["flow_project"]) + f"const okw = await waitDone({max_s}); console.log(okw ? 'DONE' : 'NOTDONE');"
    out = repl(js)
    return "DONE" in out and "NOTDONE" not in out, out


def cmd_dl(sp, spec, dst, idx=0):
    js = OPEN % J(spec["flow_project"]) + f"await download({idx});"
    for k in range(3):                                   # 남의 다운로드를 잡았으면 잠깐 쉬었다 다시
        out = repl(js)
        if "SAVED" in out and fetch_saved(out, Path(dst)):
            print("ok", dst)
            return True
        time.sleep(15 + 10 * k)
    print("✖ dl\n" + out[-2000:])
    return False


def cmd_clip(sp, spec, n):
    ln = spec["lines"][n - 1]
    src = (ROOT / spec["sources"][0]) / f"img-{n:02d}.jpg"
    name = f"{spec.get('start_prefix', 'L')}{n}-start.jpg"
    if not cmd_upload(sp, spec, src, name):
        return False
    time.sleep(20)                                    # 올린 직후엔 Start 목록에 안 뜬다(2026-11-14 두 번 실패)
    js = OPEN % J(spec["flow_project"]) + f"""
const clr = P.getByRole('button', {{name: 'Clear prompt'}}); if (await clr.count()) {{ await clr.click(); await sleep(800); }}
await P.getByRole('button', {{name: 'Settings trigger'}}).click(); await sleep(2500);
await radio('Video'); await radio('Frames'); await radio('9:16'); await radio('8s'); await radio('x1');
const cs0 = await snapshot(P);
if (!/Select model family[^\\n]*Veo 3\\.1 - Fast/.test(cs0.tree)) {{
  await P.getByRole('button', {{name: 'Select model family'}}).click(); await sleep(1000);
  await P.getByRole('menuitem', {{name: /Veo 3\\.1 - Fast/}}).first().click(); await sleep(1000);
}}
const cs = await snapshot(P);
if (!/radio "Frames" \\[ref=e\\d+\\] \\[checked\\]/.test(cs.tree)) {{ console.log('ABORT not Frames mode'); throw new Error('frames'); }}
const cred = parseInt(((cs.tree.match(/link "([0-9]+) credits?"/) || [])[1]) ?? ((await P.evaluate(() => document.body.innerText)).match(/will use ([0-9]+) credits?/) || [])[1] ?? '999');
const trig = (cs.tree.match(/Settings trigger[^\\n]*/) || [''])[0]; const fam = (cs.tree.match(/Select model family[^\\n]*/) || [''])[0];
console.log('SET', trig, fam, 'credits', cred);
await P.keyboard.press('Escape'); await sleep(500);
let picked = false;
for (let t = 0; t < 4 && !picked; t++) {{
  await P.getByRole('button', {{name: 'Start', exact: true}}).click(); await sleep(2500);
  try {{ await P.getByRole('option', {{name: new RegExp('^' + {J(re.escape(name))} + '$')}}).first().click(); picked = true; }}
  catch (e) {{ await P.keyboard.press('Escape'); await sleep(4000); }}
}}
if (!picked) {{ console.log('ABORT start option not found'); throw new Error('start option'); }}
await sleep(800);
const prev = await P.evaluate((t) => [...document.querySelectorAll('img')].find(i => i.alt === 'Preview of ' + t)?.src, {J(name)});
const atp = P.getByRole('button', {{name: 'Add to prompt'}}); if (await atp.count()) {{ await atp.click(); }} await sleep(1500);
const ing = await P.evaluate(() => [...document.querySelectorAll('img')].filter(i => /Ingredient/i.test(i.alt)).map(i => [i.src.split('?')[0], i.naturalWidth, i.naturalHeight]));
console.log('START', JSON.stringify(ing), (prev || '').split('?')[0]);
const same = ing.length === 1 && (ing[0][0] === (prev || '').split('?')[0] || /asb/.test(prev || '') || (!prev && ing[0][1] === 768 && ing[0][2] >= 1300));
if (!same) console.log('ABORT start frame mismatch');
else if (cred > 10) console.log('ABORT credits', cred);
else if (!/Veo 3\\.1 - Fast/.test(fam)) console.log('ABORT model', fam);
else {{
  await P.getByRole('textbox', {{name: 'What do you want to create?'}}).fill({J(ln['clip'])});
  await sleep(800);
  await P.getByRole('button', {{name: 'Start generation'}}).click();
  await sleep(6000);
  console.log('CLIPSTARTED', JSON.stringify((await firstGroup()).slice(0, 160)));
}}
"""
    out = repl(js)
    if "CLIPSTARTED" not in out:
        print("✖ clip", n, "\n" + out[-2500:])
        return False
    print("clip started", n, (re.search(r"credits (\d+)", out) or [None, "?"])[1] + " credits")
    dst = (ROOT / spec["sources"][0]) / f"clip-{n:02d}.mp4"
    for _ in range(4):
        ok, o = cmd_wait(sp, spec, 110)
        if ok:
            for _ in range(3):                      # 끝난 직후 영상 타일은 메뉴가 늦게 붙는다 — 잠깐 기다렸다 다시
                time.sleep(20)
                if cmd_dl(sp, spec, dst, 0):
                    return True
            return False
        if "FAILED" in o:
            print(o[-800:]); return False
    print("✖ clip not done in time"); return False


def main():
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    cmd, sp = a[0], a[1]
    sp, spec = load(sp)
    if cmd == "new":
        cmd_new(sp, spec)
    elif cmd == "upload":
        sys.exit(0 if cmd_upload(sp, spec, a[2], a[3]) else 1)
    elif cmd == "img":
        ref = a[a.index("--ref") + 1] if "--ref" in a else None
        sys.exit(0 if cmd_img(sp, spec, int(a[2]), ref) else 1)
    elif cmd == "clip":
        sys.exit(0 if cmd_clip(sp, spec, int(a[2])) else 1)
    elif cmd == "dl":
        idx = int(a[a.index("--index") + 1]) if "--index" in a else 0
        sys.exit(0 if cmd_dl(sp, spec, a[2], idx) else 1)
    elif cmd == "wait":
        ok, o = cmd_wait(sp, spec); print(o[-500:]); sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
