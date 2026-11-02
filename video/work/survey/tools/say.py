import sys, sherpa_onnx, soundfile as sf
# 오프라인 한국어 TTS — sherpa-onnx 1.x + mimic3 KSS(여성). 모델은 GitHub 릴리스에서 받는다(허깅페이스·MS 가 막힌 환경에서도 된다):
#   pip install "sherpa-onnx<2" soundfile numpy
#   curl -L -o ko.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mimic3-ko_KO-kss_low.tar.bz2 && tar xjf ko.tar.bz2
# 2.x 는 espeak 프런트엔드가 빠져 piper_phonemize 가 따로 필요한데 파이썬 3.13 휠이 없다.
# 쓰기: python3 -I tools/say.py "문장" out.wav   (환경변수 KOTTS_DIR 로 모델 폴더 지정)
import os
d=os.environ.get('KOTTS_DIR', os.path.expanduser('~/models/vits-mimic3-ko_KO-kss_low'))
cfg=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f'{d}/ko_KO-kss_low.onnx',tokens=f'{d}/tokens.txt',data_dir=f'{d}/espeak-ng-data',length_scale=float(sys.argv[3]) if len(sys.argv)>3 else 1.0),num_threads=2))
tts=sherpa_onnx.OfflineTts(cfg)
a=tts.generate(sys.argv[1], sid=0, speed=1.0)
import numpy as np; sf.write(sys.argv[2], np.asarray(a.samples, dtype="float32"), int(a.sample_rate), subtype="PCM_16")
print(sys.argv[2], len(a.samples)/a.sample_rate)
