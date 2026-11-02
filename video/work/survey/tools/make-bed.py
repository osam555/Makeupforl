"""
받침 음악 2 — 느린 피아노풍 아르페지오(92 bpm, C–Am–F–G, 8마디 반복, 50초).
1판(4화음 패드)은 '웅' 하는 배경에 가까워 사장님이 바꾸자고 했다(2026-11-02).
외부 음원은 이 환경에서 못 받아(라이선스도 따져야 해서) 직접 만든다 — 사인+배음에 타건 감쇠를 준 음을 분산화음으로 깐다.
쓰기: python3 tools/make-bed.py sfx/bed.wav
"""
import sys, numpy as np
import soundfile as sf

SR = 48000
BPM = 92
beat = 60 / BPM
step = beat / 2              # 8분음표 단위 아르페지오
total = float(sys.argv[2]) if len(sys.argv) > 2 else 50.0

def note(freq, dur, vel=1.0):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-3.2 * t) * (1 - np.exp(-t * 400))          # 타건 감쇠
    tone = (np.sin(2*np.pi*freq*t) + 0.45*np.sin(2*np.pi*2*freq*t) * np.exp(-6*t)
            + 0.18*np.sin(2*np.pi*3*freq*t) * np.exp(-9*t))
    return vel * env * tone

def hz(midi): return 440 * 2 ** ((midi - 69) / 12)

# 코드 진행(마디당 1화음): C(48,52,55,60) Am(45,48,52,57) F(41,45,48,53) G(43,47,50,55)
chords = [[48,52,55,60,64], [45,48,52,57,60], [41,45,48,53,57], [43,47,50,55,59]]
pattern = [0,1,2,3,4,3,2,1]   # 올라갔다 내려오는 분산화음(8분음표 8개 = 1마디)

out = np.zeros(int(SR * (total + 4)))
t = 0.0; i = 0
while t < total:
    chord = chords[i % 4]
    for k, idx in enumerate(pattern):
        pos = int(SR * (t + k * step))
        n = note(hz(chord[idx]), 2.2, vel=0.55 if k in (0, 4) else 0.38)
        out[pos:pos+len(n)] += n[:len(out)-pos]
    # 베이스: 마디 첫 박에 한 옥타브 아래 긴 음
    b = note(hz(chord[0] - 12), beat * 4, vel=0.5)
    pos = int(SR * t); out[pos:pos+len(b)] += b[:len(out)-pos]
    t += beat * 4; i += 1

out = out[:int(SR * total)]
# 살짝 울림(짧은 에코 두 번) — 피아노방 느낌
echo = np.zeros_like(out)
for d, g in ((0.11, 0.25), (0.23, 0.12)):
    s = int(SR * d); echo[s:] += out[:-s] * g
out = out + echo
out = out / (np.max(np.abs(out)) + 1e-9) * 0.5
sf.write(sys.argv[1], out.astype(np.float32), SR, subtype='PCM_16')
print(sys.argv[1], round(total, 1), 's')
