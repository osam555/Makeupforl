#!/usr/bin/env python3
"""
혼주메이크업 100문100답 원고(docx) -> 서비스용 JSON 변환기

입력 : scripts/wed100/source.docx
출력 : src/data/wed100.json

JSON 구조
{
  "meta":  { title, subtitle, author, generatedFrom, totalQuestions },
  "parts": [ { part, title, intro[] } ],
  "items": [ {
      id, slug, part, partTitle, n,
      question,                # 질문 문구
      answer: [str],           # 답변 문단
      cues:   [ {i, ko} ],     # 자막/TTS 단위(문장) - 영어는 3_merge_en.py 가 en 필드를 채움
      keywords: [str]
  } ]
}
"""
import json
import os
import re
import sys

import docx

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "scripts", "wed100", "source.docx")
OUT = os.path.join(ROOT, "src", "data", "wed100.json")

# 문장 분리: 종결부호 뒤 공백 기준. 따옴표 안 종결부호도 하나의 문장으로 유지.
SENT_END = re.compile(r'(?<=[.!?…])\s+|(?<=[.!?…]["”’])\s+')


def split_sentences(text: str, max_len: int = 90):
    """한국어 문장 분리 + 너무 긴 문장은 쉼표/연결어미 기준 2차 분할(자막 가독성)."""
    raw = [s.strip() for s in SENT_END.split(text) if s.strip()]
    out = []
    for s in raw:
        if len(s) <= max_len:
            out.append(s)
            continue
        # 2차 분할: 쉼표 뒤에서 자르되 조각이 20자 이상이 되도록 묶는다
        chunks, buf = [], ""
        for piece in re.split(r'(?<=,)\s*', s):
            if len(buf) + len(piece) <= max_len or len(buf) < 20:
                buf += piece
            else:
                chunks.append(buf.strip())
                buf = piece
        if buf.strip():
            chunks.append(buf.strip())
        out.extend(chunks)
    return out


def extract_keywords(question: str, answer_text: str, limit: int = 4):
    """간단 키워드 추출 - 도메인 사전 기반(태그/검색용)."""
    dictionary = [
        "혼주 전문", "공장식", "예약", "사전 컨설팅", "출장 메이크업", "샵 메이크업",
        "가격", "비용", "퍼스널 컬러", "한복", "올림머리", "업스타일", "가발", "헤어피스",
        "볼륨", "탈모", "단발", "피부", "베이스", "잡티", "주름", "다크서클", "속눈썹",
        "아이브로우", "립", "블러셔", "사진", "영상", "조명", "예식 당일", "액세서리",
        "귀걸이", "브로치", "코르사주", "드레스", "정장", "한복 색상", "동안", "리터치",
        "클렌징", "긴장", "표정", "웃음",
    ]
    hay = question + " " + answer_text
    found = [w for w in dictionary if w in hay]
    # 긴 키워드 우선
    found.sort(key=len, reverse=True)
    dedup = []
    for w in found:
        if any(w in d for d in dedup):
            continue
        dedup.append(w)
    return dedup[:limit]


def main():
    if not os.path.exists(SRC):
        sys.exit(f"원고를 찾을 수 없습니다: {SRC}")

    doc = docx.Document(SRC)
    rows = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        style = p.style.name if p.style is not None else ""
        rows.append((style, t))

    # 본문 시작점: 'PART 1' + Heading 1 조합
    start = None
    for i, (s, t) in enumerate(rows):
        if re.fullmatch(r"PART\s*1", t) and i + 1 < len(rows) and rows[i + 1][0] == "Heading 1":
            start = i
            break
    if start is None:
        sys.exit("본문 시작(PART 1)을 찾지 못했습니다.")

    body = rows[start:]
    parts, items = [], []
    cur_part, cur_item = None, None

    for i, (s, t) in enumerate(body):
        if t == "맺음말":
            break
        if re.fullmatch(r"PART\s*\d+", t) and i + 1 < len(body) and body[i + 1][0] == "Heading 1":
            cur_part = {
                "part": int(re.findall(r"\d+", t)[0]),
                "title": body[i + 1][1],
                "intro": [],
            }
            parts.append(cur_part)
            cur_item = None
            continue
        if s == "Heading 1":
            continue
        if s == "Heading 2":
            m = re.match(r"^(\d+)\.\s*(.+)$", t)
            n = int(m.group(1)) if m else len(cur_part_items(items, cur_part)) + 1
            q = m.group(2) if m else t
            cur_item = {
                "id": len(items) + 1,
                "slug": f"p{cur_part['part']}-{n:02d}",
                "part": cur_part["part"],
                "partTitle": cur_part["title"],
                "n": n,
                "question": q,
                "answer": [],
            }
            items.append(cur_item)
            continue
        if cur_part is None:
            continue
        if cur_item is None:
            cur_part["intro"].append(t)
        else:
            cur_item["answer"].append(t)

    # 자막/TTS 큐 생성
    for it in items:
        cues = []
        for para in it["answer"]:
            for sent in split_sentences(para):
                cues.append({"i": len(cues), "ko": sent})
        it["cues"] = cues
        it["keywords"] = extract_keywords(it["question"], " ".join(it["answer"]))

    data = {
        "meta": {
            "title": "혼주메이크업 100문 100답",
            "subtitle": "결혼식 날, 후회하면 늦습니다",
            "author": "메이크업포엘 대표원장 김성희",
            "generatedFrom": "혼주메이크업_100문100답.docx",
            "totalQuestions": len(items),
            "languages": {"content": ["ko"], "subtitles": ["ko", "en"]},
        },
        "parts": parts,
        "items": items,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

    print(f"[OK] {OUT}")
    for p in parts:
        cnt = len([x for x in items if x["part"] == p["part"]])
        print(f"  PART {p['part']}. {p['title']} — {cnt}문")
    print(f"  총 {len(items)}문 / 자막 큐 {sum(len(x['cues']) for x in items)}개")


def cur_part_items(items, part):
    return [x for x in items if part and x["part"] == part["part"]]


if __name__ == "__main__":
    main()
