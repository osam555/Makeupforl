"""원장님 컷의 입 벌림 크기를 숫자로 잰다 — Flow 컷끼리 입 크기가 들쭉날쭉하지 않은지 확인하는 자.

2026-11-06 「25초 부분 등 원장 말할 때 입이 너무 크게 벌어진다 — 앞으로 입 크기도 유지하게」.
Flow(Veo)는 같은 첫 프레임에서 시작해도 클립마다 연기가 달라, ① 은 입을 작게 움직이는데
② 는 이를 다 드러내며 크게 웃고 ③ 은 「오」 모양으로 크게 벌렸다. 눈으로만 보면 놓치기 쉬워 숫자로 견준다.

재는 법: 얼굴 상자(Wav2Lip 의 S3FD 검출기)를 찾고 그 아래쪽 입 자리에서
  - 입 안: 얼굴 피부 밝기의 45% 보다 어두운 픽셀
  - 이: 채도가 낮고(<0.22) 피부보다 밝은 픽셀
이 차지하는 비율을 「입 벌림」으로 본다. 말하는 동안의 90번째 백분위(가장 크게 벌린 순간들)를 대표값으로 쓴다.
기준은 ① 블록이다 — 원장님이 「이 정도」로 본 크기. 다른 컷이 ① 의 1.3배를 넘으면 다시 만든다.

실행:  ~/.venvs/voice/bin/python scripts/video/mouth_size.py <기준.mp4> <비교.mp4> [<비교2.mp4> ...]
"""
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.expanduser("~/tools/Wav2Lip"))
import face_detection  # noqa: E402

LIMIT = 1.3     # 기준 컷 대비 허용 배율
STEP = 3        # 프레임 몇 장마다 하나씩 잴지(24~30fps → 초당 8~10장)


def measure(path, det):
    cap = cv2.VideoCapture(path)
    frames, i = [], 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        if i % STEP == 0:
            # S3FD 를 CPU 로 1080p 그대로 돌리면 8초 클립 하나에 몇 분 걸린다 — 폭 360 으로 줄여 잰다(비율값이라 결과는 같다)
            frames.append(cv2.resize(f, (360, round(f.shape[0] * 360 / f.shape[1]))))
        i += 1
    vals = []
    for k in range(0, len(frames), 8):
        batch = frames[k:k + 8]
        rects = det.get_detections_for_batch(np.array(batch))
        for f, r in zip(batch, rects):
            if r is None:
                continue
            x1, y1, x2, y2 = [int(v) for v in r]
            w, h = x2 - x1, y2 - y1
            face = f[y1:y2, x1:x2]
            mouth = f[y1 + int(h * 0.66):y1 + int(h * 0.95), x1 + int(w * 0.25):x1 + int(w * 0.75)]
            if mouth.size == 0 or face.size == 0:
                continue
            hsv_f = cv2.cvtColor(face, cv2.COLOR_BGR2HSV).astype(float) / 255
            skin_v = np.median(hsv_f[..., 2])
            hsv = cv2.cvtColor(mouth, cv2.COLOR_BGR2HSV).astype(float) / 255
            dark = hsv[..., 2] < skin_v * 0.45
            teeth = (hsv[..., 1] < 0.22) & (hsv[..., 2] > skin_v * 1.02)
            vals.append(float((dark | teeth).mean()))
    v = np.array(vals)
    return float(np.percentile(v, 90)) if len(v) else float("nan"), float(v.mean()) if len(v) else float("nan")


def main(ref, *others):
    det = face_detection.FaceAlignment(face_detection.LandmarksType._2D, flip_input=False, device="cpu")  # 이 검출기는 cpu/cuda 만 받는다
    r90, rmean = measure(ref, det)
    print(f"기준 {os.path.basename(ref)}: 입 벌림 p90 {r90:.3f} (평균 {rmean:.3f})")
    bad = 0
    for p in others:
        p90, pm = measure(p, det)
        ratio = p90 / r90 if r90 else float("nan")
        flag = "다시 만들 것" if ratio > LIMIT else "통과"
        bad += ratio > LIMIT
        print(f"  {os.path.basename(p)}: p90 {p90:.3f} (평균 {pm:.3f}) → 기준의 {ratio:.2f}배 {flag}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main(*sys.argv[1:])
