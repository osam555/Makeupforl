"""
내레이션 7줄을 Typecast 로 — 맥에서 돌린다(클라우드 세션은 api.typecast.ai 가 막혀 있다).

사장님 결정(2026-11-02): 목소리는 Typecast. 100문100답 MC 와 같은 목소리(Jinhee)를 기본으로 쓴다 —
`scripts/wed100/3_gen_tts.py` 의 synth_typecast 와 같은 요청이다(모델 ssfm-v30, 감정 normal).
키는 Vercel 의 TYPECAST_API_KEY 와 같은 값. 로컬 .env.local 에는 넣지 말고(CLAUDE.md) 셸 환경변수로만 넘긴다.

    TYPECAST_API_KEY=... python3 tools/say-typecast.py              # tts/lines.json → tts/n1..n7.mp3
    TYPECAST_API_KEY=... TYPECAST_VOICE_ID=tc_... python3 tools/say-typecast.py   # 다른 목소리
    TYPECAST_API_KEY=... python3 tools/say-typecast.py --preview     # 첫 줄만 → tts/preview-typecast.mp3

끝나면 `bash assemble.sh`. 목소리 ID 는 Typecast 콘솔 > Voices 에서 복사한다.
"""
import argparse, json, os, subprocess, sys, urllib.request
from pathlib import Path

here = Path(__file__).resolve().parent.parent
KEY = os.environ.get('TYPECAST_API_KEY', '')
VOICE = os.environ.get('TYPECAST_VOICE_ID', 'tc_6731b2b2478a48710ecc9158')  # Jinhee — 100문100답 MC 와 같은 목소리
MODEL = os.environ.get('TYPECAST_MODEL', 'ssfm-v30')
EMOTION = os.environ.get('TYPECAST_EMOTION', 'normal')
URL = 'https://api.typecast.ai/v1/text-to-speech'

ap = argparse.ArgumentParser()
ap.add_argument('--preview', action='store_true')
args = ap.parse_args()
if not KEY:
    sys.exit('TYPECAST_API_KEY 가 없습니다. Vercel 환경변수 값을 셸에 넣고 다시 실행하세요.')

lines = json.loads((here / 'tts' / 'lines.json').read_text(encoding='utf-8'))
out = here / 'tts'; out.mkdir(exist_ok=True)

def synth(text: str, dst: Path):
    req = urllib.request.Request(URL, data=json.dumps({
        'text': text, 'model': MODEL, 'voice_id': VOICE, 'language': 'kor',
        'prompt': {'emotion_type': 'preset', 'emotion_preset': EMOTION},
        'output': {'audio_format': 'wav'},
    }).encode(), headers={'X-API-KEY': KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as f:
        raw = f.read()
    src = dst.with_suffix('.src.wav'); src.write_bytes(raw)
    # Typecast 원본은 44.1kHz/조용한 편 — assemble.sh 의 다른 소리와 같은 48kHz, 음량 -16 LUFS 로
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-af', 'loudnorm=I=-16:TP=-1.5',
                    '-ar', '48000', '-c:a', 'libmp3lame', '-q:a', '3', str(dst)], check=True)
    src.unlink()
    print(dst.name, text[:30])

if args.preview:
    synth(next(iter(lines.values())), out / 'preview-typecast.mp3')
else:
    for k, text in lines.items():
        synth(text, out / f'{k}.mp3')
