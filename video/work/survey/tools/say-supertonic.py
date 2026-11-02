"""
내레이션 7줄을 Supertonic(수퍼톤 공개 한국어 TTS)으로 — 맥에서 돌린다.

클라우드 세션에서는 허깅페이스가 막혀 가중치를 못 받았고, 거기서 쓴 mimic3 KSS 는 발음이 뭉개져
사장님이 퇴짜를 놓았다(2026-11-02). Supertonic 3 는 한국어가 본래 언어라 또렷하고, 목소리 10개(M1~M5·F1~F5)
중에서 고를 수 있다. 첫 실행 때 가중치(수백 MB)를 허깅페이스에서 받아 캐시한다.

    pip install supertonic soundfile
    python3 tools/say-supertonic.py            # tts/lines.json 전부 → tts/n1..n7.mp3 (기본 F1)
    python3 tools/say-supertonic.py --voice M2 # 다른 목소리
    python3 tools/say-supertonic.py --preview  # 첫 줄만 목소리 10개로 뽑아 tts/preview-*.mp3 — 고르는 용도

끝나면 `bash assemble.sh` 가 파일을 자동으로 얹는다. mp3 는 48kHz 로 맞춰 둔다(assemble 의 다른 소리와 같게).
"""
import argparse, json, subprocess, sys
from pathlib import Path

here = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--voice', default='F1', help='M1~M5, F1~F5')
ap.add_argument('--speed', type=float, default=1.0, help='1.0 보통. 느리게는 0.92 정도')
ap.add_argument('--preview', action='store_true', help='첫 줄을 목소리 10개로')
args = ap.parse_args()

from supertonic import TTS  # noqa: E402  (설치 안내는 위 docstring)
import soundfile as sf  # noqa: E402

tts = TTS()  # supertonic-3, 첫 실행 때 내려받음
lines = json.loads((here / 'tts' / 'lines.json').read_text(encoding='utf-8'))
out = here / 'tts'
out.mkdir(exist_ok=True)

def render(text: str, voice: str, dst: Path):
    style = tts.get_voice_style(voice)
    wav, _dur = tts.synthesize(text, voice_style=style, lang='ko', speed=args.speed)
    tmp = dst.with_suffix('.wav')
    tts.save_audio(wav, str(tmp))
    # 48kHz mp3 + 음량 정리 — assemble.sh 의 다른 소리와 같은 규격
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(tmp), '-af', 'loudnorm=I=-16:TP=-1.5',
                    '-ar', '48000', '-c:a', 'libmp3lame', '-q:a', '3', str(dst)], check=True)
    tmp.unlink(missing_ok=True)
    print(dst.name, text[:30])

if args.preview:
    first = next(iter(lines.values()))
    for v in ['F1', 'F2', 'F3', 'F4', 'F5', 'M1', 'M2', 'M3', 'M4', 'M5']:
        try:
            render(first, v, out / f'preview-{v}.mp3')
        except Exception as e:  # 모델판에 없는 목소리는 건너뛴다
            print(v, '건너뜀:', e, file=sys.stderr)
else:
    for k, text in lines.items():
        render(text, args.voice, out / f'{k}.mp3')
