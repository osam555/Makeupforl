"""Wav2Lip 결과에서 입 주변만 떼어 원본 위에 얹는다.

Wav2Lip 은 얼굴 상자를 96px 로 줄여 다시 그린 뒤 늘려 붙이므로 눈·코까지 흐려진다
(2026-10-15 블록① 시험에서 확인). 원장님 얼굴이 바뀌지 않는 것이 이 작업의 핵심이라
입 말고는 원본 픽셀을 그대로 둔다. 얼굴 위치는 원본에서 프레임마다 다시 찾는다 —
Flow 영상은 고개가 조금씩 움직여서 고정 마스크를 쓰면 입이 마스크 밖으로 나간다.

실행:  ~/.venvs/voice/bin/python scripts/video/mouth_blend.py <원본.mp4> <wav2lip.mp4> <음성.wav> <출력.mp4>
Wav2Lip 의 face_detection 모듈(~/tools/Wav2Lip)을 빌려 쓴다.
"""
import os
import subprocess
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.expanduser("~/tools/Wav2Lip"))
import face_detection  # noqa: E402

FEATHER = 0.18   # 마스크 가장자리 흐림(얼굴 너비 비율) — 작으면 경계선이 보인다


def read_frames(path):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    return frames, fps


def smooth(boxes, k=5):
    # 프레임마다 검출값이 몇 px 씩 떨려서 마스크가 같이 떤다 — 앞뒤 평균으로 누른다
    b = np.array(boxes, dtype=float)
    out = b.copy()
    for i in range(len(b)):
        out[i] = b[max(0, i - k // 2): i + k // 2 + 1].mean(0)
    return out


def main(base_path, w2l_path, audio_path, out_path):
    base, fps = read_frames(base_path)
    w2l, _ = read_frames(w2l_path)
    n = min(len(base), len(w2l))
    base, w2l = base[:n], w2l[:n]
    det = face_detection.FaceAlignment(face_detection.LandmarksType._2D, flip_input=False, device="cpu")
    boxes = []
    for i in range(0, n, 8):
        rects = det.get_detections_for_batch(np.array(base[i:i + 8]))
        for r in rects:
            boxes.append(r if r is not None else boxes[-1])
    boxes = smooth(boxes)
    h, w = base[0].shape[:2]
    # 중간 파일을 cv2 의 mp4v 로 쓰면 눈 선명도가 원본 128 → 102 로 떨어졌다(블록① 실측).
    # 프레임을 그대로 ffmpeg 에 흘려 한 번만 압축한다.
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
                            "-s", f"{w}x{h}", "-r", str(fps), "-i", "-", "-i", audio_path,
                            "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "14",
                            "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                            "-shortest", out_path], stdin=subprocess.PIPE)
    yy, xx = np.mgrid[0:h, 0:w]
    for i in range(n):
        x1, y1, x2, y2 = boxes[i]
        fw, fh = x2 - x1, y2 - y1
        # 입 타원: 얼굴 상자 가로 가운데, 세로 아래쪽 3/4 지점 — 코끝 아래부터 턱 위까지
        cx, cy = (x1 + x2) / 2, y1 + fh * 0.76
        rx, ry = fw * 0.30, fh * 0.20
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        m = np.clip((1 + FEATHER - d) / (2 * FEATHER), 0, 1)[..., None]
        f = base[i] * (1 - m) + w2l[i] * m
        enc.stdin.write(np.round(f).astype(np.uint8).tobytes())
    enc.stdin.close()
    enc.wait()
    print("saved", out_path, n, "frames")


if __name__ == "__main__":
    main(*sys.argv[1:5])
