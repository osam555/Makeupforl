#!/usr/bin/env bash
# 효과음 4개를 ffmpeg 로 합성한다 — sfx/thud.wav · whoosh.wav · ding.wav · tap.wav (모두 48kHz 스테레오).
# 기획서 5-3절이 "assemble.sh 윗부분 주석의 ffmpeg 명령" 이라고 했지만 그 명령은 저장소에 남아 있지 않았다.
# 맥에서 처음 돌릴 때 막히지 않도록 여기에 둔다. Sunra 판을 sfx/real/{thud,ding,whoosh}.mp3 로 두면 assemble.sh 는 그쪽을 먼저 쓴다.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p sfx
g(){ ffmpeg -loglevel error -y "$@"; }
# 쿵: 55Hz 에서 시작해 내려앉는 사인 + 빠른 감쇠
g -f lavfi -i "aevalsrc=0.9*sin(2*PI*(52+70*exp(-18*t))*t)*exp(-6*t):d=0.9:s=48000:c=stereo" sfx/thud.wav
# 휙: 분홍 잡음이 서서히 커졌다 사라짐
g -f lavfi -i "anoisesrc=d=1.2:c=pink:a=0.6:r=48000" -af "lowpass=f=3200,highpass=f=300,afade=t=in:d=0.55,afade=t=out:st=0.55:d=0.65,aformat=channel_layouts=stereo" sfx/whoosh.wav
# 띵: 두 음(E6·B6)이 길게 울림
g -f lavfi -i "aevalsrc=0.42*sin(2*PI*1318*t)*exp(-4.5*t)+0.26*sin(2*PI*1976*t)*exp(-5.5*t):d=1.1:s=48000:c=stereo" sfx/ding.wav
# 탭: 짧은 클릭
g -f lavfi -i "aevalsrc=0.5*sin(2*PI*1900*t)*exp(-90*t)+0.15*sin(2*PI*620*t)*exp(-60*t):d=0.12:s=48000:c=stereo" sfx/tap.wav
ls -la sfx
