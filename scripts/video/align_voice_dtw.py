"""복제 음성을 Flow 영상 속 목소리에 촘촘히 맞춘다 — 입은 그 목소리와 이미 맞으므로, 그 목소리를 자로 쓴다.

align_voice.py(whisper 낱말 시각 → 0.8초 넘는 구 단위로 늘이기)로 만든 소개 쇼츠 ②③ 이
「원장 음성과 입이 일치하지 않는다」는 지적을 받았다(2026-11-04). 재 보니 두 가지였다:
  - whisper 낱말 시각이 실제 소리와 0.7초까지 어긋났다(복제 음성 「마세요」 끝: whisper 3.50초, 실제 2.81초).
    첫 낱말 시작은 양쪽 다 0.0초로 적혀 기준점 노릇을 못 했다.
  - 구 하나(0.8초 이상) 안에서는 말 빠르기를 한 비율로만 바꿔서, 구 안의 음절이 입과 따로 놀았다.
Flow 원본은 입과 제 목소리가 어긋남 0초(입 열림↔소리 크기 상관 0.40)로 맞는다. 그래서 받아쓰기를 버리고
두 소리의 MFCC 를 DTW 로 짝지어 0.25초 남짓마다 기준점을 잡고, 그 사이를 atempo(피치 유지)로 늘이고 줄인다.

Flow 소리에는 예식장 잔향·잡음이 깔려 쉼이 -40dB 로도 안 잡힌다 — 그래서 쉼이 아니라 소리의 모양으로 맞춘다.
조각이 짧으면 atempo 이음매가 들려서 조각 사이를 10ms 로 겹쳐 잇는다.

실행:  ~/.venvs/voice/bin/python scripts/video/align_voice_dtw.py <flow영상> <복제음성.wav> <출력.wav>
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

FR = 16000
HOP = 160            # 10ms
STEP = 0.3           # 기준점 간격(초) — 음절 두세 개. 0.25 는 조각이 짧아 atempo 이음매·뭉개짐이 들렸다
MIN_R, MAX_R = 0.7, 1.45   # 0.55~1.8 로 두면 「혼주」가 「홍주」「본주」로 뭉개졌다(받아쓰기)


def load(path, sr):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                       check=True, capture_output=True).stdout
    return np.frombuffer(b, np.float32).copy()


def feats(x):
    m = librosa.feature.mfcc(y=x, sr=FR, n_mfcc=20, hop_length=HOP, n_fft=512)[1:]   # 0번(음량)은 빼 잡음 영향을 줄인다
    m = (m - m.mean(1, keepdims=True)) / (m.std(1, keepdims=True) + 1e-6)
    return m


def stretch(seg, sr, ratio):
    """ratio = 원래 길이 / 목표 길이. atempo 한 단은 0.5~2.0 이라 그 안에서만 쓴다."""
    with tempfile.TemporaryDirectory() as td:
        a, b = Path(td) / "a.wav", Path(td) / "b.wav"
        sf.write(a, seg, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a), "-af", f"atempo={ratio:.5f}", str(b)], check=True)
        y, _ = sf.read(b, dtype="float32")
    return y


def main(flow_path, clone_path, out_path):
    flow = load(flow_path, FR)
    clone16 = load(clone_path, FR)
    clone, sr = sf.read(clone_path, dtype="float32")
    if clone.ndim > 1:
        clone = clone.mean(1)
    total = len(flow) / FR

    F, C = feats(flow), feats(clone16)
    _, wp = librosa.sequence.dtw(X=C, Y=F, metric="cosine")
    wp = wp[::-1]                                   # (복제 프레임, flow 프레임) 앞에서부터
    tc, tf = wp[:, 0] * HOP / FR, wp[:, 1] * HOP / FR

    # 복제 음성의 앞뒤 무음은 버리고 말 구간 안에서만 기준점을 잡는다
    nz = np.where(np.abs(clone) > 10 ** (-45 / 20))[0]
    c0, c1 = nz[0] / sr, nz[-1] / sr
    anchors_c = list(np.arange(c0, c1, STEP)) + [c1]
    anchors_f = [float(np.median(tf[np.abs(tc - c) < 0.006])) if np.any(np.abs(tc - c) < 0.006)
                 else float(np.interp(c, tc, tf)) for c in anchors_c]
    # 단조 증가 + 늘이기 비율을 범위 안으로
    for i in range(1, len(anchors_f)):
        dc = anchors_c[i] - anchors_c[i - 1]
        lo, hi = anchors_f[i - 1] + dc / MAX_R, anchors_f[i - 1] + dc / MIN_R
        anchors_f[i] = min(max(anchors_f[i], lo), hi)

    out = np.zeros(int(total * sr) + sr, dtype=np.float32)
    xf = int(0.010 * sr)
    pos = int(anchors_f[0] * sr)
    for i in range(len(anchors_c) - 1):
        a, b = int(anchors_c[i] * sr), int(anchors_c[i + 1] * sr)
        target = anchors_f[i + 1] - anchors_f[i]
        seg = clone[max(0, a - xf):b]
        y = stretch(seg, sr, ((b - a) / sr) / target) if target > 0 else seg
        start = int(anchors_f[i] * sr) - xf
        start = max(0, start)
        if i > 0:
            y[:xf] *= np.linspace(0, 1, xf)
        out[start:start + len(y)] += y[:len(out) - start]
        pos = start + len(y)
    out = out[:int(total * sr)]
    sf.write(out_path, out, sr)
    rs = [(anchors_c[i + 1] - anchors_c[i]) / (anchors_f[i + 1] - anchors_f[i]) for i in range(len(anchors_c) - 1)]
    print(f"기준점 {len(anchors_c)}개, 말 시작 복제 {c0:.2f}s → 영상 {anchors_f[0]:.2f}s, "
          f"끝 {c1:.2f}s → {anchors_f[-1]:.2f}s, 늘이기 {min(rs):.2f}~{max(rs):.2f}배")
    print("saved", out_path)


if __name__ == "__main__":
    main(*sys.argv[1:4])
