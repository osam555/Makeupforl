import json, subprocess, sys
from pathlib import Path
S = Path(__file__).parent / "specs"
B = Path(__file__).resolve().parents[3] / "video/work/i2v"
base = json.load(open(B / "p4-18/damchae/flow-spec.json"))
still = json.load(open(B / "p4-19/damchae/flow-spec-still.json"))
CL = ("Static camera, no zoom, no cut. Keep exactly the same scene, person, hanbok and Korean ink-and-wash illustration style "
      "(fine ink lines, soft watercolor washes, hanji paper texture stay visible the whole time; never becomes photorealistic or 3D) "
      "as the start frame. {m} Her face is never visible. Only small, natural movement. No new people, no new objects, no text, no camera shake.")
LOOK = " The woman: Korean mother of the bride in her late 50s, short pale pink silk jeogori with long goreum ribbon, deep magenta full chima, dark brown hair in a neat low chignon; seen only from behind, face never visible."
allp = json.load(open(S / "free5.json"))
only = sys.argv[1:] or list(allp)
for slug in only:
    p = allp[slug]
    D = B / slug / "damchae"; D.mkdir(parents=True, exist_ok=True)
    lines = []
    for sc in p["scenes"]:
        img = sc["img"] + (LOOK if sc["p"] == "person" else "")
        ln = {"img": img}
        if sc["kind"] == "clip":
            ln["clip"] = CL.format(m=sc["m"])
        lines.append(ln)
    for name, src, banned in [("person", base, base["banned"]), ("object", still, still["banned"])]:
        sp = dict(base); sp.update(id=f"wed100-i2v-{slug}", sources=[str(D)], start_prefix=p["prefix"], banned=banned, lines=lines)
        json.dump(sp, open(D / f"flow-spec-{name}.json", "w"), ensure_ascii=False, indent=2)
    for i, sc in enumerate(p["scenes"], 1):
        if (D / f"img-{i:02d}.jpg").exists():
            continue
        cmd = ["python3", "flow.py", "img", str(D / f"flow-spec-{sc['p']}.json"), str(i)]
        if sc["p"] == "person":
            cmd += ["--ref", "ref-damchae.jpg"]
        for attempt in range(2):
            r = subprocess.run(cmd, cwd=Path(__file__).parent, capture_output=True, text=True)
            if (D / f"img-{i:02d}.jpg").exists():
                break
        print(slug, i, "ok" if (D / f"img-{i:02d}.jpg").exists() else "FAIL " + r.stdout[-300:], flush=True)
