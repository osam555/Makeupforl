"""
내레이션 7줄을 ElevenLabs 로 — 사장님 요청(2026-11-03), Typecast(Jinhee) 판 대신.

목소리는 계정에 있는 한국어 여성 목소리 Anna Kim(서울 억양, ko 인증)이 기본. 모델은 eleven_multilingual_v2 —
v3 는 더 표현력이 있지만 한국어 발음이 줄마다 들쭉날쭉해서 7줄 톤을 맞추기엔 v2 가 안전하다. SDK 는 안 깔려 있어 REST 로.
키는 셸의 ELEVENLABS_API_KEY. 출력 규격은 say-typecast.py 와 같다(48kHz mp3, -16 LUFS) — assemble.sh 가 둘을 구별하지 않는다.

    python3 tools/say-elevenlabs.py                 # tts/lines.json → tts/n1..n7.mp3
    ELEVENLABS_VOICE_ID=... python3 tools/say-elevenlabs.py   # 다른 목소리
    python3 tools/say-elevenlabs.py --preview       # 첫 줄만 → tts/preview-elevenlabs.mp3

Typecast 판으로 되돌리려면 tools/say-typecast.py 를 다시 돌리면 같은 파일 이름에 덮어쓴다.
"""
import argparse, json, os, subprocess, sys, urllib.request
from pathlib import Path

here = Path(__file__).resolve().parent.parent
KEY = os.environ.get('ELEVENLABS_API_KEY', '')
VOICE = os.environ.get('ELEVENLABS_VOICE_ID', 'uyVNoMrnUku1dZyVEXwD')  # Anna Kim — 계정의 한국어 여성 목소리
MODEL = os.environ.get('ELEVENLABS_MODEL', 'eleven_multilingual_v2')
TEMPO = float(os.environ.get('ELEVENLABS_TEMPO', '1.08'))

ap = argparse.ArgumentParser()
ap.add_argument('--preview', action='store_true')
args = ap.parse_args()
if not KEY:
    sys.exit('ELEVENLABS_API_KEY 가 없습니다.')

lines = json.loads((here / 'tts' / 'lines.json').read_text(encoding='utf-8'))
out = here / 'tts'; out.mkdir(exist_ok=True)

def synth(text: str, dst: Path):
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128',
        data=json.dumps({
            'text': text, 'model_id': MODEL, 'language_code': 'ko',
            # 안정 0.5 / 유사 0.8 / 스타일 0.2: 광고 톤보다 설명 톤. 스타일을 올리면 줄마다 억양이 달라진다
            'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.2, 'use_speaker_boost': True},
        }).encode(),
        headers={'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=120) as f:
        raw = f.read()
    src = dst.with_suffix('.src.mp3'); src.write_bytes(raw)
    # 1.08배속: ElevenLabs 는 같은 문장을 Typecast 보다 0.3~0.9초 길게 읽어, n5 가 설문 구간(22초)을 넘어 어드민 장면까지 밀렸다
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-af', f'atempo={TEMPO},loudnorm=I=-16:TP=-1.5',
                    '-ar', '48000', '-c:a', 'libmp3lame', '-q:a', '3', str(dst)], check=True)
    src.unlink()
    print(dst.name, text[:30])

if args.preview:
    synth(next(iter(lines.values())), out / 'preview-elevenlabs.mp3')
else:
    for k, text in lines.items():
        synth(text, out / f'{k}.mp3')
