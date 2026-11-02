#!/usr/bin/env bash
# 쇼츠 A 가편집 — 장면 다섯을 잇고 자막을 얹는다. 내레이션은 이 환경에서 TTS 가 막혀 아직 없다(맥에서 붙인다).
# 자막 시각은 rec/steps.json 의 단계 시각 + 앞 장면 길이. 녹화를 다시 하면 아래 숫자를 steps.json 에 맞춰 고칠 것.
set -euo pipefail
cd "$(dirname "$0")"
F=fonts/Pretendard-Bold.otf
FR=fonts/Pretendard-Regular.otf
OUT=../../out; mkdir -p "$OUT"

# 장면 길이(초) — 녹화는 통째로, 그래픽은 장면표 길이로 자른다
CLOCK=3.2; ADMIN=4.9; NUMBER=4.4; END=6.0
SURVEY=$(ffprobe -v error -show_entries format=duration -of csv=p=0 rec/survey.mp4)

# 단계 시각(steps.json) → 전체 타임라인 (앞에 시계 3초)
S=$CLOCK
who=$(python3 -c "import json;print($S+[s for s in json.load(open('rec/steps.json')) if s['k']=='who'][0]['t'])")
worry=$(python3 -c "import json;print($S+[s for s in json.load(open('rec/steps.json')) if s['k']=='worry'][0]['t'])")
offer=$(python3 -c "import json;print($S+[s for s in json.load(open('rec/steps.json')) if s['k']=='offer'][0]['t'])")
form=$(python3 -c "import json;print($S+[s for s in json.load(open('rec/steps.json')) if s['k']=='form'][0]['t'])")
submit=$(python3 -c "import json;print($S+[s for s in json.load(open('rec/steps.json')) if s['k']=='submit'][0]['t'])")
sEnd=$(python3 -c "print($S+$SURVEY)")
aEnd=$(python3 -c "print($sEnd+$ADMIN)")
nEnd=$(python3 -c "print($aEnd+$NUMBER)")

# 자막 한 줄: 하단 1/4, 흰 글씨 + 검은 테두리
sub() { # $1 시작 $2 끝 $3 글
  printf "drawtext=fontfile=%s:text='%s':fontsize=62:fontcolor=white:box=1:boxcolor=black@0.62:boxborderw=26:x=(w-text_w)/2:y=h-300:alpha='min(1,min((t-%s)/0.26,(%s-t)/0.26))':enable='between(t,%s,%s)'," "$F" "$3" "$1" "$2" "$1" "$2"
}
SUBS=$(
  sub 0 $CLOCK "밤 10시 40분"
  sub $CLOCK $who "홈페이지가 먼저 말을 건다"
  sub $who $worry "탭 한 번"
  sub $worry $offer "탭 두 번 — 맞는 답이 나온다"
  sub $offer $form "예약하면 이용권 값은 돌려받는다"
  sub $form $submit "탭 세 번 — 연락처만 남기면 끝"
  sub $submit $sEnd "원장님이 직접 전화드릴게요"
  sub $sEnd $aEnd "아침에 원장님 폰에 떠 있다"
  sub $nEnd 999 "무료로 시작"
)
# 녹화 구간 동안 위쪽에 작은 고지
NOTE="drawtext=fontfile=$FR:text='실제 화면 · 손님 정보는 가상입니다':fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=12:x=(w-text_w)/2:y=130:enable='between(t,$CLOCK,$sEnd)'"

# 소리 — 내레이션 파일(tts/n1..n7.mp3)이 있으면 자막 시각에 맞춰 얹고, 없으면 받침 음악·효과음만.
# 효과음은 sfx/ (ffmpeg 로 합성: 알림 '띵', 탭 클릭, 4화음 패드). 시각은 자막과 같은 변수.
TOTAL=$(python3 -c "print($nEnd+$END)")
ms(){ python3 -c "print(int(round($1*1000)))"; }
AIN="-i sfx/bed.wav -i sfx/ding.wav -i sfx/ding.wav -i sfx/tap.wav -i sfx/tap.wav -i sfx/tap.wav -i sfx/tap.wav"
AF="[5:a]volume=0.55,afade=t=out:st=$(python3 -c "print($TOTAL-1.5)"):d=1.5[bed];"
AF+="[6:a]adelay=$(ms 1.3)|$(ms 1.3),volume=0.8[d1];[7:a]adelay=$(ms $(python3 -c "print($sEnd+2.8)"))|$(ms $(python3 -c "print($sEnd+2.8)")),volume=0.8[d2];"
AF+="[8:a]adelay=$(ms $who)|$(ms $who)[t1];[9:a]adelay=$(ms $worry)|$(ms $worry)[t2];[10:a]adelay=$(ms $form)|$(ms $form)[t3];[11:a]adelay=$(ms $submit)|$(ms $submit)[t4];"
MIX="[bed][d1][d2][t1][t2][t3][t4]"; N=7; IDX=12
if ls tts/n1.mp3 >/dev/null 2>&1; then
  # 내레이션 시작 시각: 장면표 순서대로
  for pair in "n1:$CLOCK" "n2:$who" "n3:$worry" "n4:$offer" "n5:$form" "n6:$sEnd" "n7:$aEnd"; do
    f=${pair%%:*}; at=${pair#*:}
    [ -f tts/$f.mp3 ] || continue
    AIN+=" -i tts/$f.mp3"; AF+="[$IDX:a]adelay=$(ms $at)|$(ms $at),volume=1.0[$f];"; MIX+="[$f]"; N=$((N+1)); IDX=$((IDX+1))
  done
fi
AF+="${MIX}amix=inputs=$N:duration=first:normalize=0,alimiter=limit=0.9,loudnorm=I=-14:TP=-1.5:LRA=11[a]"

ffmpeg -loglevel error -y \
  -t $CLOCK -i rec/clock.mp4 -i rec/survey.mp4 -t $ADMIN -i rec/admin.mp4 -t $NUMBER -i rec/number.mp4 -t $END -i rec/end.mp4 $AIN \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v]concat=n=5:v=1:a=0,${SUBS}${NOTE},fade=in:0:10,fade=out:st=$(python3 -c "print($TOTAL-0.6)"):d=0.6,format=yuv420p[v];$AF" \
  -map "[v]" -map "[a]" -t $TOTAL -r 25 -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT/설문봇-쇼츠A-draft.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/설문봇-쇼츠A-draft.mp4"
