"""Flow 영상 속 목소리를 원장님 음색으로 바꾼다 — 박자는 영상 그대로라 입이 맞는다.

소개 쇼츠 ②③ 은 복제 음성(clone_tts.py)을 Flow 입 박자에 맞춰 늘이고 줄였는데(align_voice.py),
「원장 음성과 입이 일치하지 않는다」는 지적을 받았다(2026-11-04). 재 보니 복제 음성과 Flow 입은
구간마다 0.3초씩 어긋났고, DTW 로 촘촘히 맞추면(align_voice_dtw.py) 어긋남은 0.03초로 줄지만
조각을 0.55~1.8배로 늘이고 줄이다 보니 「혼주」가 「홍주」「본주」로 뭉개졌다. 늘이기 폭을 좁히면 다시 어긋난다.
→ 말을 새로 읽혀 박자를 맞추는 대신, 이미 입과 맞는 Flow 의 말을 그대로 두고 **목소리 색만** 바꾼다.

1. Flow 소리에는 예식장 잔향·잡음이 깔려 있다 → demucs 로 목소리만 걷어 낸다(참조 음성을 만들 때와 같은 방법)
2. ChatterboxVC 로 참조 음성(video/work/voice-ref-short.wav — clone_tts.py 와 같은 12초)의 음색을 입힌다
3. 길이는 원본과 같게 자르고 채운다 — 변환은 박자를 바꾸지 않는다

실행:  ~/.venvs/voice/bin/python scripts/video/flow_voice_convert.py <flow영상> <참조.wav> <출력.wav> [--plain]
  --plain : 잡음이 없는 소리(복제 음성 등)는 demucs 를 건너뛴다 — 깨끗한 소리에 걸면 오히려 숨소리가 깎인다
  --vocals: 변환하지 않고 demucs 로 걸러 낸 목소리만 저장한다(참조 음성 만들 때)

2026-11-06: 「원장 음성이 4가지 정도 나온다 — 첫번째 음성을 유지하게」. Flow 는 클립마다 목소리가 달라
①②③ 과 복제 음성(B롤 구간)이 다 다르게 들렸다. ① Flow 목소리를 걸러 참조로 삼고 나머지를 모두 그 음색으로 바꾼다.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
import torch


def main(flow_path, ref_path, out_path, *flags):
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        wav = td / "flow.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(flow_path), "-vn", "-ac", "1", "-ar", "44100", str(wav)],
                       check=True)
        dur = sf.info(wav).duration
        if "--plain" in flags:
            voc = wav
        else:
            subprocess.run([sys.executable, "-m", "demucs", "--two-stems", "vocals", "-o", str(td), str(wav)],
                           check=True, capture_output=True)
            voc = next(td.glob("*/flow/vocals.wav"))
        if "--vocals" in flags:
            y, sr0 = sf.read(voc, dtype="float32")
            sf.write(out_path, y.mean(1) if y.ndim > 1 else y, sr0)
            print(f"saved {out_path} (vocals only)")
            return
        from chatterbox.vc import ChatterboxVC
        device = "mps" if torch.backends.mps.is_available() else "cpu"
        vc = ChatterboxVC.from_pretrained(device)
        y = vc.generate(audio=str(voc), target_voice_path=str(ref_path))
        y = y.squeeze(0).cpu().numpy().astype(np.float32)
        sr = vc.sr
    n = int(dur * sr)
    y = np.pad(y, (0, max(0, n - len(y))))[:n]
    sf.write(out_path, y, sr)
    print(f"saved {out_path}  {len(y) / sr:.2f}s @ {sr}Hz")


if __name__ == "__main__":
    main(*sys.argv[1:])
