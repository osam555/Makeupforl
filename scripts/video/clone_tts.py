"""원장님 목소리 복제로 대본을 읽힌다 — 로컬 Chatterbox Multilingual (무료, 맥에서 실행).

HeyGen·Flow 가 둘 다 실패한 이유는 클립마다 목소리가 달라지는 것이었다(2026-10).
그래서 여기서는
  - 참조 음성 한 개(채널 영상에서 배경음악을 demucs 로 걷어낸 원장님 목소리)를 모든 줄에 똑같이 쓰고
  - 시드를 고정해 같은 줄을 다시 뽑아도 같은 소리가 나게 하고
  - 줄마다 따로 뽑아 0.35초 간격으로 이어붙인다(한 번에 길게 뽑으면 뒤로 갈수록 목소리가 흐트러진다).

줄마다 `<출력>.lines/` 에 따로 저장하고 파일 이름에 그 줄 글자의 해시를 넣는다.
발음 하나 고치려고 대본 한 줄을 바꾸면 그 줄만 새로 뽑히고 나머지는 원장님이 듣고
「이걸로 가자」 한 그 소리 그대로 남는다 — 통째로 다시 뽑으면 들은 것과 달라진다.

발음이 틀리는 낱말은 대본에서 쉼표·띄어쓰기로 고쳐 적는다(자막은 따로 둔다).
2026-10-15 에 후보 4개씩 뽑아 whisper 로 들어 보고 고른 것:
  「어떤 혼주 헤어가」 → 「어떤, 혼주 헤어가」 — 그대로면 「혼주의 여」로 뭉개졌다.
     「혼주헤어가,」(붙여 씀)는 「혼주의어」로 더 나빴다.
  「메이크업포엘」 → 「메이크업 포엘」 — 붙여 쓰면 「포일」, 「메이크업포 엘」은 영어로 읽었다.

실행:  ~/.venvs/voice/bin/python scripts/video/clone_tts.py <대본.txt> <참조.wav> <출력.wav>
대본.txt 는 한 줄 = 한 문장. 빈 줄은 0.6초 쉼.
"""
import hashlib
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

SEED = 7
GAP = 0.35      # 문장 사이 — 원장님 실제 영상의 문장 간 쉼(0.3~0.5초) 중간값
PARA_GAP = 0.6


def main(script_path: str, ref_path: str, out_path: str) -> None:
    lines_dir = Path(out_path + ".lines")
    lines_dir.mkdir(parents=True, exist_ok=True)
    model = None
    sr = None
    out: list[np.ndarray] = []
    for i, line in enumerate(open(script_path, encoding="utf-8").read().splitlines()):
        line = line.strip()
        if not line:
            out.append(None)  # 쉼 — sr 을 알게 된 뒤 채운다
            continue
        key = hashlib.sha1(f"{line}|{SEED}|{Path(ref_path).name}".encode()).hexdigest()[:10]
        f = lines_dir / f"{i:02d}-{key}.wav"
        if f.exists():
            wav, sr = sf.read(f, dtype="float32")
            tag = "그대로"
        else:
            if model is None:
                from chatterbox.mtl_tts import ChatterboxMultilingualTTS
                device = "mps" if torch.backends.mps.is_available() else "cpu"
                model = ChatterboxMultilingualTTS.from_pretrained(device=device)
            sr = model.sr
            torch.manual_seed(SEED)
            wav = model.generate(line, language_id="ko", audio_prompt_path=ref_path,
                                 exaggeration=0.5, cfg_weight=0.5)
            wav = wav.squeeze(0).cpu().numpy().astype(np.float32)
            sf.write(f, wav, sr)
            tag = "새로"
        out.append(wav)
        out.append(np.zeros(int(sr * GAP), dtype=np.float32))
        print(f"{tag:3s} {len(wav) / sr:5.2f}s  {line}", flush=True)
    out = [np.zeros(int(sr * PARA_GAP), dtype=np.float32) if a is None else a for a in out]
    sf.write(out_path, np.concatenate(out), sr)
    print("saved", out_path)


if __name__ == "__main__":
    main(*sys.argv[1:4])
