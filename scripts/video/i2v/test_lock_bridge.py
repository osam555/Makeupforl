# 실행: python3 -m unittest scripts/video/i2v/test_lock_bridge.py
import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("TYPECAST_API_KEY", "test")
sys.path.insert(0, str(Path(__file__).parent))
import lock_bridge as lb  # noqa: E402


class LockBridgeTest(unittest.TestCase):
    def test_목록_번호를_읽기_쉬운_말로_바꾼다(self):
        self.assertEqual(lb.spoken("P2·04"), "파트 2의 4번")
        self.assertEqual(lb.spoken("P6·06"), "파트 6의 6번")

    def test_잠금_화면은_남은_답부터_말하고_구매는_전화로_둔다(self):
        lines = lb.lock_lines({"loop": "둘째·셋째 준비물은?", "label": "P2·04"})
        self.assertEqual(lines[0], "둘째·셋째 준비물은?")
        self.assertIn("프로필 링크 → P2·04", lines)
        self.assertEqual(lines[-1], "신청 · 전화 02-323-3321")


if __name__ == "__main__":
    unittest.main()
