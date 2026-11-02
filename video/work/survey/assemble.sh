#!/usr/bin/env bash
# 쇼츠 A 가편집 — 장면 다섯을 잇고 자막을 얹는다. 내레이션은 이 환경에서 TTS 가 막혀 아직 없다(맥에서 붙인다).
# 자막 시각은 rec/steps.json 의 단계 시각 + 앞 장면 길이. 녹화를 다시 하면 아래 숫자를 steps.json 에 맞춰 고칠 것.
set -euo pipefail
cd "$(dirname "$0")"
F=fonts/Pretendard-Bold.otf
FR=fonts/Pretendard-Regular.otf
OUT=../../out; mkdir -p "$OUT"
# NO_TTS=1 → 내레이션 없이 자막만(인스타·무음 재생용). 내레이션 문장은 작은 둘째 줄로 들어간다. 파일 이름도 다르다
NO_TTS=${NO_TTS:-0}
NAME=설문봇-쇼츠A-draft; [ "$NO_TTS" = 1 ] && NAME=설문봇-쇼츠A-자막판

# 장면 길이(초) — 녹화는 통째로, 그래픽은 장면표 길이로 자른다
HOOK=3.4; CLOCK=2.4; ADMIN=4.9; NUMBER=4.4; END=6.0
SURVEY=$(ffprobe -v error -show_entries format=duration -of csv=p=0 rec/survey.mp4)

# 단계 시각(steps.json) → 전체 타임라인 (앞에 훅 + 시계)
S=$(python3 -c "print($HOOK+$CLOCK)")
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
  sub $HOOK $S "밤 10시 40분"
  sub $S $who "홈페이지가 먼저 말을 건다"
  sub $who $worry "탭 한 번"
  sub $worry $offer "탭 두 번 — 맞는 답이 나온다"
  sub $offer $form "예약하면 이용권 값은 돌려받는다"
  sub $form $submit "탭 세 번 — 연락처만 남기면 끝"
  sub $submit $sEnd "원장님이 직접 전화드릴게요"
  sub $sEnd $aEnd "아침에 원장님 폰에 떠 있다"
  sub $nEnd 999 "지금 물어보세요"
)
# 자막판: 내레이션 문장을 둘째 줄로 — 줄바꿈은 쉼표·마침표 자리에서(한 줄 22자 안팎), textfile 로 넘긴다
SUB2=""
if [ "$NO_TTS" = 1 ]; then
  mkdir -p rec/sub2
  python3 - <<'PY'
import json,re
L=json.load(open('tts/lines.json'))
for k,t in L.items():
    parts=[p.strip() for p in re.split(r'(?<=[.,])\s+', t) if p.strip()]
    lines=[];cur=''
    for p in parts:
        if cur and len(cur)+len(p)>24: lines.append(cur); cur=p
        else: cur=(cur+' '+p).strip()
    if cur: lines.append(cur)
    open(f'rec/sub2/{k}.txt','w').write('\n'.join(lines))
PY
  sub2(){ printf "drawtext=fontfile=%s:textfile=rec/sub2/%s.txt:fontsize=40:line_spacing=10:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=18:x=(w-text_w)/2:y=h-200:alpha='min(1,min((t-%s)/0.26,(%s-t)/0.26))':enable='between(t,%s,%s)'," "$FR" "$1" "$2" "$3" "$2" "$3"; }
  SUB2=$(sub2 n1 $S $who; sub2 n2 $who $worry; sub2 n3 $worry $offer; sub2 n4 $offer $form; sub2 n5 $form $sEnd; sub2 n6 $aEnd $nEnd; sub2 n7 $nEnd 999)
fi
# 녹화 구간 동안 위쪽에 작은 고지
NOTE="drawtext=fontfile=$FR:text='실제 화면 · 손님 정보는 가상입니다':fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=12:x=(w-text_w)/2:y=130:enable='between(t,$S,$sEnd)'"

# 소리 — 내레이션 파일(tts/n1..n7.mp3)이 있으면 장면 시각에 맞춰 얹고, 없으면 받침 음악·효과음만.
# 내레이션은 tools/say.py(오프라인 TTS)로 만든다. 문장은 tts/lines.json. Sunra·Typecast 로 바꿔 뽑아도 파일 이름만 같으면 된다.
# 효과음은 sfx/ (ffmpeg 로 합성: 알림 '띵', 탭 클릭, 4화음 패드). 시각은 자막과 같은 변수.
TOTAL=$(python3 -c "print($nEnd+$END)")
ms(){ python3 -c "print(int(round($1*1000)))"; }
# 효과음 파일 고르기 — Sunra(ElevenLabs Sound Effects)로 만든 sfx/real/{thud,ding,whoosh}.mp3 가 있으면 그걸, 없으면 ffmpeg 합성본
pick(){ [ -f "sfx/real/$1.mp3" ] && echo "sfx/real/$1.mp3" || echo "sfx/$1.wav"; }
DING=$(pick ding); THUD=$(pick thud); WHOOSH=$(pick whoosh)
AIN="-i sfx/bed.wav -i $DING -i $DING -i sfx/tap.wav -i sfx/tap.wav -i sfx/tap.wav -i sfx/tap.wav -i $THUD -i $THUD -i $WHOOSH -i $WHOOSH"
AF="[6:a]volume=0.55,afade=t=in:d=2.5,afade=t=out:st=$(python3 -c "print($TOTAL-1.5)"):d=1.5[bed];"
AF+="[7:a]adelay=$(ms $(python3 -c "print($HOOK+1.0)"))|$(ms $(python3 -c "print($HOOK+1.0)")),volume=0.8[d1];[8:a]adelay=$(ms $(python3 -c "print($sEnd+2.8)"))|$(ms $(python3 -c "print($sEnd+2.8)")),volume=0.8[d2];"
AF+="[9:a]adelay=$(ms $who)|$(ms $who)[t1];[10:a]adelay=$(ms $worry)|$(ms $worry)[t2];[11:a]adelay=$(ms $form)|$(ms $form)[t3];[12:a]adelay=$(ms $submit)|$(ms $submit)[t4];"
AF+="[13:a]adelay=150|150[k1];[14:a]adelay=1000|1000[k2];[15:a]adelay=50|50,volume=0.7[w1];[16:a]adelay=900|900,volume=0.7[w2];"
MIX="[bed][d1][d2][t1][t2][t3][t4][k1][k2][w1][w2]"; N=11; IDX=17
if [ "$NO_TTS" != 1 ] && ls tts/n1.mp3 >/dev/null 2>&1; then
  # 내레이션 시작 시각: 장면 시각과 "앞 줄이 끝난 뒤 0.25초" 중 늦은 쪽 — 줄이 겹치면 못 알아듣는다
  prevEnd=0
  for pair in "n1:$S" "n2:$who" "n3:$worry" "n4:$offer" "n5:$form" "n6:$aEnd" "n7:$nEnd"; do
    f=${pair%%:*}; want=${pair#*:}
    [ -f tts/$f.mp3 ] || continue
    at=$(python3 -c "print(max($want, $prevEnd+0.25))")
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 tts/$f.mp3)
    prevEnd=$(python3 -c "print($at+$dur)")
    AIN+=" -i tts/$f.mp3"; AF+="[$IDX:a]adelay=$(ms $at)|$(ms $at),volume=1.0[$f];"; MIX+="[$f]"; N=$((N+1)); IDX=$((IDX+1))
  done
  # 말이 있으면 받침 음악은 더 낮게
  AF=${AF/volume=0.55,afade=t=in/volume=0.32,afade=t=in}
fi
AF+="${MIX}amix=inputs=$N:duration=first:normalize=0,alimiter=limit=0.9,loudnorm=I=-14:TP=-1.5:LRA=11[a]"

ffmpeg -loglevel error -y \
  -t $HOOK -i rec/hook.mp4 -t $CLOCK -i rec/clock.mp4 -i rec/survey.mp4 -t $ADMIN -i rec/admin.mp4 -t $NUMBER -i rec/number.mp4 -t $END -i rec/end.mp4 $AIN \
  -filter_complex "[0:v][1:v][2:v][3:v][4:v][5:v]concat=n=6:v=1:a=0,${SUBS}${SUB2}${NOTE},fade=out:st=$(python3 -c "print($TOTAL-0.6)"):d=0.6,format=yuv420p[v];$AF" \
  -map "[v]" -map "[a]" -t $TOTAL -r 25 -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT/$NAME.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$NAME.mp4"
