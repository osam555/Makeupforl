#!/usr/bin/env bash
# 쇼츠 A 조립 — 장면을 잇고 자막·그래픽·소리를 얹는다.
#
# 7차(2026-11-02, "더 쉽게, 밀도 있게"):
#  - 녹화 화면을 폰 틀 안에(둥근 모서리 + 그림자, 장미색 바탕) — 날것의 캡처보다 "화면을 보여 주는 영상" 으로 읽힌다
#  - 탭 자리에 파문(링) — 손님이 어디를 눌렀는지 보인다 (좌표는 record.mjs 가 steps.json 에 남긴다)
#  - 위쪽 단계 칩 "1/3 누구세요 → 2/3 걱정은 → 답 + 무료 문항 → 이용권 → 3/3 연락처 → 접수 완료"
#  - 어드민 뒤에 요약 장면(세 번 누르기 → 아침에 전화 → 예약)
#  - 맨 위 진행 막대, 받침 음악은 더 낮게(사장님 요청)
# 자막 시각은 rec/steps.json 의 단계 시각 + 앞 장면 길이. 녹화를 다시 하면 steps.json 이 바뀌므로 그대로 따라간다.
set -euo pipefail
cd "$(dirname "$0")"
F=fonts/Pretendard-Bold.otf
FR=fonts/Pretendard-Regular.otf
OUT=../../out; mkdir -p "$OUT"
# NO_TTS=1 → 내레이션 없이 자막만(인스타·무음 재생용). 내레이션 문장은 작은 둘째 줄로 들어간다. 파일 이름도 다르다
NO_TTS=${NO_TTS:-0}
NAME=설문봇-쇼츠A-draft; [ "$NO_TTS" = 1 ] && NAME=설문봇-쇼츠A-자막판

# 장면 길이(초) — 녹화는 통째로, 그래픽은 장면표 길이로 자른다
HOOK=3.4; CLOCK=1.8; ADMIN=4.6; RECAP=3.4; NUMBER=4.0; END=5.5
SURVEY=$(ffprobe -v error -show_entries format=duration -of csv=p=0 rec/survey.mp4)

# 단계 시각(steps.json) → 전체 타임라인 (앞에 훅 + 시계)
S=$(python3 -c "print($HOOK+$CLOCK)")
st(){ python3 -c "import json;print($S+[s for s in json.load(open('rec/steps.json')) if s['k']=='$1'][0]['t'])"; }
who=$(st who); worry=$(st worry); offer=$(st offer); form=$(st form); submit=$(st submit)
sEnd=$(python3 -c "print($S+$SURVEY)")
aEnd=$(python3 -c "print($sEnd+$ADMIN)")
rEnd=$(python3 -c "print($aEnd+$RECAP)")
nEnd=$(python3 -c "print($rEnd+$NUMBER)")
TOTAL=$(python3 -c "print($nEnd+$END)")
ms(){ python3 -c "print(int(round($1*1000)))"; }

# ── 폰 틀: 녹화를 912×1656 으로 줄여 (84,132) 에 놓고 둥근 모서리 마스크, 장미색 바탕 위에 ──
PX=84; PY=132; PW=912; PH=1656
# 탭 파문 좌표 변환: 녹화 픽셀 → 폰 틀 안 픽셀, 링 그림(300×300)의 중심을 맞춘다
rx(){ python3 -c "import json;s=[s for s in json.load(open('rec/steps.json')) if s['k']=='$1'][0];print(int($PX+s['x']*$PW/1080-150))"; }
ry(){ python3 -c "import json;s=[s for s in json.load(open('rec/steps.json')) if s['k']=='$1'][0];print(int($PY+s['y']*$PH/1920-150))"; }

# ── 자막(큰 줄): 하단, 흰 글씨 + 검은 상자, 0.26초 페이드 ──
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
# ── 단계 칩(위쪽, 장미색 상자): 지금 화면이 무슨 단계인지 ──
chip() { printf "drawtext=fontfile=%s:text='%s':fontsize=40:fontcolor=white:box=1:boxcolor=0x9b2b4a@0.95:boxborderw=18:x=(w-text_w)/2:y=190:enable='between(t,%s,%s)'," "$F" "$3" "$1" "$2"; }
CHIPS=$(
  chip $S $who "1/3  누구세요?"
  chip $who $worry "2/3  뭐가 걱정이세요?"
  chip $worry $offer "맞는 답 + 무료 문항"
  chip $offer $form "이용권 55,000원 · 예약하면 차감"
  chip $form $submit "3/3  연락처만 남기면 끝"
  chip $submit $sEnd "접수 완료 — 원장님이 전화"
)
# ── 자막판: 내레이션 문장을 둘째 줄로(쉼표·마침표에서 줄바꿈, 한 줄 24자 안팎) ──
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
  SUB2=$(sub2 n1 $S $who; sub2 n2 $who $worry; sub2 n3 $worry $offer; sub2 n4 $offer $form; sub2 n5 $form $sEnd; sub2 n6 $rEnd $nEnd; sub2 n7 $nEnd 999)
fi
# 녹화 구간 위쪽 작은 고지 + 맨 위 진행 막대
NOTE="drawtext=fontfile=$FR:text='실제 화면 · 손님 정보는 가상입니다':fontsize=26:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=96:enable='between(t,$S,$sEnd)',"
BAR="drawbox=x=0:y=0:w='iw*t/$TOTAL':h=14:color=0x9b2b4a@0.95:t=fill,"

# ── 소리 ──
# 내레이션은 tts/n1..n7.mp3 (맥에서 Typecast: tools/say-typecast.py). 효과음은 sfx/real/*.mp3 가 있으면 그걸, 없으면 ffmpeg 합성본.
# 받침 음악 sfx/bed.wav 는 tools/make-bed.py(피아노 분산화음). 음량: 말 없을 때 0.40, 말 있을 때 0.22 (7차에 낮춤).
pick(){ [ -f "sfx/real/$1.mp3" ] && echo "sfx/real/$1.mp3" || echo "sfx/$1.wav"; }
DING=$(pick ding); THUD=$(pick thud); WHOOSH=$(pick whoosh)
# 입력 번호: 0 hook 1 clock 2 survey 3 admin 4 recap 5 number 6 end | 7 bg 8 mask | 9~ 소리 | 그 뒤 파문 4개
AIN="-i sfx/bed.wav -i $DING -i $DING -i sfx/tap.wav -i sfx/tap.wav -i sfx/tap.wav -i sfx/tap.wav -i $THUD -i $THUD -i $WHOOSH -i $WHOOSH"
BEDVOL=0.40; [ "$NO_TTS" != 1 ] && ls tts/n1.mp3 >/dev/null 2>&1 && BEDVOL=0.22
AF="[9:a]volume=$BEDVOL,afade=t=in:d=2.5,afade=t=out:st=$(python3 -c "print($TOTAL-1.5)"):d=1.5[bed];"
AF+="[10:a]adelay=$(ms $(python3 -c "print($HOOK+0.8)"))|$(ms $(python3 -c "print($HOOK+0.8)")),volume=0.8[d1];[11:a]adelay=$(ms $(python3 -c "print($sEnd+2.6)"))|$(ms $(python3 -c "print($sEnd+2.6)")),volume=0.8[d2];"
AF+="[12:a]adelay=$(ms $who)|$(ms $who)[t1];[13:a]adelay=$(ms $worry)|$(ms $worry)[t2];[14:a]adelay=$(ms $form)|$(ms $form)[t3];[15:a]adelay=$(ms $submit)|$(ms $submit)[t4];"
AF+="[16:a]adelay=150|150[k1];[17:a]adelay=1000|1000[k2];[18:a]adelay=50|50,volume=0.7[w1];[19:a]adelay=900|900,volume=0.7[w2];"
MIX="[bed][d1][d2][t1][t2][t3][t4][k1][k2][w1][w2]"; N=11; IDX=20
if [ "$NO_TTS" != 1 ] && ls tts/n1.mp3 >/dev/null 2>&1; then
  # 내레이션 시작: 장면 시각과 "앞 줄 끝 + 0.25초" 중 늦은 쪽 — 겹치면 못 알아듣는다
  prevEnd=0
  for pair in "n1:$S" "n2:$who" "n3:$worry" "n4:$offer" "n5:$form" "n6:$rEnd" "n7:$nEnd"; do
    f=${pair%%:*}; want=${pair#*:}
    [ -f tts/$f.mp3 ] || continue
    at=$(python3 -c "print(max($want, $prevEnd+0.25))")
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 tts/$f.mp3)
    prevEnd=$(python3 -c "print($at+$dur)")
    AIN+=" -i tts/$f.mp3"; AF+="[$IDX:a]adelay=$(ms $at)|$(ms $at),volume=1.0[$f];"; MIX+="[$f]"; N=$((N+1)); IDX=$((IDX+1))
  done
fi
AF+="${MIX}amix=inputs=$N:duration=first:normalize=0,alimiter=limit=0.9,loudnorm=I=-14:TP=-1.5:LRA=11[a]"

# ── 파문 4개: 링 PNG 12장(22fps ≈ 0.55초)을 탭 시각·좌표에 ──
RIN=""; ROV=""; prev="[phone]"
for k in who worry form submit; do
  t=$(python3 -c "import json;print([s for s in json.load(open('rec/steps.json')) if s['k']=='$k'][0]['t'])"); x=$(rx $k); y=$(ry $k)
  RIN+=" -framerate 22 -start_number 0 -i rec/ring/r%02d.png"
  ROV+="[$IDX:v]setpts=PTS+$t/TB,format=rgba[r$k];${prev}[r$k]overlay=$x:$y:eof_action=pass[p$k];"
  prev="[p$k]"; IDX=$((IDX+1))
done

# 녹화를 폰 틀에: bg 위에 올리고 → 마스크로 둥글게 → 다시 bg 위에
PHONE="[7:v]format=rgb24,split[bg1][bg2];[8:v]format=gray[mk];[2:v]scale=$PW:$PH[sv];[bg1][sv]overlay=$PX:$PY[flat];[flat][mk]alphamerge[fa];[bg2][fa]overlay=0:0,format=yuv420p[phone];"

ffmpeg -loglevel error -y \
  -t $HOOK -i rec/hook.mp4 -t $CLOCK -i rec/clock.mp4 -i rec/survey.mp4 -t $ADMIN -i rec/admin.mp4 -t $RECAP -i rec/recap.mp4 -t $NUMBER -i rec/number.mp4 -t $END -i rec/end.mp4 \
  -loop 1 -t $SURVEY -i rec/bg.png -loop 1 -t $SURVEY -i rec/mask.png $AIN $RIN \
  -filter_complex "${PHONE}[0:v][1:v]concat=n=2:v=1:a=0[head];${ROV/\[phone\]/[phone]}${prev}setpts=PTS-STARTPTS[sv2];[head][sv2][3:v][4:v][5:v][6:v]concat=n=6:v=1:a=0,${SUBS}${CHIPS}${SUB2}${NOTE}${BAR}fade=out:st=$(python3 -c "print($TOTAL-0.6)"):d=0.6,format=yuv420p[v];$AF" \
  -map "[v]" -map "[a]" -t $TOTAL -r 25 -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT/$NAME.mp4"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$NAME.mp4"
