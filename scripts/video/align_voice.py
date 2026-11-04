"""복제한 원장님 목소리를 Flow 영상 속 말의 박자에 맞춰 늘이고 줄인다 — 입은 손대지 않는다.

Wav2Lip 으로 입을 다시 그리면 720p 에서 입이 눈에 띄게 흐려졌다(블록② 입 선명도 110 → 39).
그런데 Flow 에 한국어 대사를 그대로 주면 영상 속 인물이 **같은 문장**을 말한다(2026-10-15 확인).
그렇다면 입을 고칠 게 아니라 목소리를 입에 맞추면 된다 — 영상은 원본 그대로라 선명도 손실이 없다.

두 음성을 whisper 로 낱말 단위로 받아써 같은 낱말끼리 시각을 맞춘다. 낱말마다 따로 늘이면
「모두」가 2.2배로 늘어나는 식이라 어색해서, 0.8초보다 짧은 구간은 이웃과 합쳐 구(句) 단위로 늘인다.
늘이기는 ffmpeg atempo(피치 유지) — 0.7~1.4배 안이라 소리가 뭉개지지 않는다.

실행:  python3 scripts/video/align_voice.py <flow음성.json> <복제음성.json> <복제음성.wav> <flow영상길이초> <출력.wav>
json 은 whisper --word_timestamps True 결과. 두 대본의 낱말 수가 같아야 한다(다르면 멈춘다).
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

MIN_SEG = 0.8


def words(path):
    d = json.load(open(path))
    return [(w["word"].strip(), w["start"], w["end"]) for s in d["segments"] for w in s["words"]]


def main(flow_json, clone_json, clone_wav, total, out):
    fw, cw = words(flow_json), words(clone_json)
    if len(fw) != len(cw):
        sys.exit(f"낱말 수가 다르다: flow {len(fw)} / 복제 {len(cw)} — 대본이 같은지 확인")
    # 기준점: 첫 낱말 시작, 낱말 사이 경계들, 마지막 낱말 끝
    fa = [fw[0][1]] + [w[1] for w in fw[1:]] + [fw[-1][2]]
    ca = [cw[0][1]] + [w[1] for w in cw[1:]] + [cw[-1][2]]
    keep = [0]
    for i in range(1, len(fa) - 1):
        if fa[i] - fa[keep[-1]] >= MIN_SEG and ca[i] - ca[keep[-1]] >= MIN_SEG * 0.6:
            keep.append(i)
    if fa[-1] - fa[keep[-1]] < MIN_SEG and len(keep) > 1:
        keep.pop()
    keep.append(len(fa) - 1)
    tmp = Path(tempfile.mkdtemp())
    parts = []
    lead = fa[0]
    if lead > 0.01:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
                        "-t", f"{lead:.3f}", tmp / "lead.wav"], check=True)
        parts.append(tmp / "lead.wav")
    for k in range(len(keep) - 1):
        a, b = keep[k], keep[k + 1]
        cd, fd = ca[b] - ca[a], fa[b] - fa[a]
        tempo = cd / fd
        print(f"{fw[a][0]:>8s} … {fw[b - 1][0]:<8s} 복제 {cd:.2f}s → 영상 {fd:.2f}s  (x{1 / tempo:.2f})")
        seg = tmp / f"s{k:02d}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ca[a]:.3f}", "-to", f"{ca[b]:.3f}", "-i", clone_wav,
                        "-af", f"atempo={tempo:.4f}", "-ac", "1", "-ar", "24000", seg], check=True)
        parts.append(seg)
    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-af", f"apad=whole_dur={float(total):.3f}", "-t", f"{float(total):.3f}", out], check=True)
    print("saved", out)


if __name__ == "__main__":
    main(*sys.argv[1:6])
