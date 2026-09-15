# CEO 칼럼 — SEO 콘텐츠 섹션 기획안

**버전**: v0.1 (2026-09-15, 초안) · **작성**: Claude + 매니저(john.wu571)
**서비스 주체**: 메이크업포엘 (대표원장 김성희) · makeupforl.co.kr
**성격**: 손님용 무료 콘텐츠 · SEO 유입 확보 · 100문100답(유료)으로의 깔때기

> 이 문서는 **원장 결재 전 기획안**이다. 코드는 아직 건드리지 않았다.
> 8절의 "결정이 필요한 것"을 정한 뒤 `/admin/proposals` 에 제안으로 올려 착수한다.

---

## 1. 왜 만드는가

### 1.1 지금 상태 — 빈 슬롯
- 옛 PHP 사이트에는 **CEO컬럼(`/sub/sub01_03.php`)** 이 있었으나, 옮겨온 페이지가 없어
  지금은 `next.config.ts:52` 에서 `/brand` 로 301 리다이렉트만 걸려 있다. 즉 **자리는 이미 있고 내용만 비었다.**
- 이 저장소에 블로그·칼럼·게시글 성격의 **자체 구현은 하나도 없다.** ("blog" 는 전부 외부 네이버 블로그 링크,
  "article" 은 100문100답 상세의 `Article` JSON-LD 뿐)
- 100문100답이 사실상 "원장 칼럼" 역할을 겸하고 있으나, 이건 **유료 상품**이라 검색 유입의 관문으로 쓰기엔
  대부분 잠겨 있다.

### 1.2 문제 → 해결
| 문제 | CEO 칼럼이 푸는 것 |
|---|---|
| 검색어 허브(3개)와 100문100답(102문) 말고는 **새로 쌓이는 콘텐츠가 없다** — 사이트가 정적으로 굳어 있다 | 시의성·롱테일 글을 주기적으로 발행해 색인 페이지 수와 신선도(freshness)를 늘린다 |
| 대형 검색어는 허브가 잡지만 **롱테일·정보성·계절성 검색어**를 받을 랜딩이 없다 | "상견례 메이크업", "가을 혼주 한복 색", "60대 피부 화장" 같은 긴 질의를 칼럼 글로 흡수 |
| 유료 상품(100문100답)뿐이라 **첫 방문자가 무료로 신뢰를 쌓을 통로가 약하다** | 무료 칼럼으로 전문성을 먼저 보여 주고 → 100문100답/상담 CTA 로 전환 |
| 검색엔진의 **E-E-A-T**(경험·전문성·권위·신뢰) 신호가 NAP·사업자 스키마에 머문다 | 필자=대표원장, 발행일/수정일, `BlogPosting` 스키마, 실명·경력으로 저자 권위 신호 강화 |

### 1.3 KPI
- 칼럼 페이지 검색 유입(월간) — 특히 허브가 못 잡는 롱테일 질의
- 칼럼 → 100문100답 / 상담예약 CTA 클릭·전환율
- 색인된 칼럼 URL 수, 내부링크 증가분(→ `seoKeywords` 준비도에 반영)

---

## 2. 이 저장소의 규칙과 어떻게 맞물리는가

기획의 모든 선택은 CLAUDE.md 의 다음 뼈대를 **그대로 따른다.** 새 발명은 최소로 한다.

- **Firestore 우선 · 시드 JSON 폴백** — Firebase 가 하나도 세팅 안 돼도 칼럼이 보여야 한다.
  `src/lib/wed100.ts` 의 3단 폴백(Admin SDK → 클라 SDK → `src/data/*.json`)을 복제한다.
- **유료 경계 유지** — 칼럼 본문은 "문제·맥락이 무엇인가"까지만 쓰고, **처방은 100문100답/상담으로 넘긴다.**
  허브(`hubs.ts`) 상단 주석과 같은 원칙. 문항의 답을 그대로 옮기지 않는다(유료 상품이 남아야 한다).
- **`.server.ts` 분리** — `firebase-admin` 을 쓰는 코드는 `columns.server.ts` 로 나눈다.
  타입·순수함수·상수는 `columns.ts` 에 둔다(화면에서도 import 하므로).
- **내부링크는 실측이다** — 칼럼 본문에 허브·문항·상담 링크를 걸면 `scripts/count-internal-links.py` 를
  다시 돌려 `src/data/internal-links.json` 을 갱신·커밋해야 준비도 계산에 반영된다.
- **결재·업무일지** — 칼럼 신규/수정은 `/admin/proposals` 제안으로, 한 일은 `/admin/worklog` 에 남긴다.
- **SITE_URL·sitemap·robots** — 새 경로는 `src/app/sitemap.ts` 에 더해야 색인된다. `robots.ts` 는 `/admin`·`/api` 만 막으므로 칼럼은 자동 허용.

---

## 3. 정보 구조 (IA) · URL 설계

```
메이크업포엘 (기존)
├─ 브랜드소개 (/brand)
├─ CEO 칼럼                          ← 신규 (무료, SEO)
│   ├─ /column                       목록: 히어로 → 최신순 카드 → 100문100답 CTA
│   └─ /column/[slug]                상세: 본문 + 관련 허브/문항 + 상담 CTA
├─ 혼주메이크업 100문100답 (/honjoo100)   유료
├─ 검색어 허브 (/혼주한복 …)
└─ /admin/column                     칼럼 편집 (신규 탭)
```

### 3.1 경로 후보 (원장 결정 필요 — 8절)
| 후보 | 장점 | 단점 |
|---|---|---|
| **`/column` (권장)** | 영문이라 인코딩 이슈 없음, `[slug]` 중첩 안전, `[topic]` 동적 라우트와 충돌 없음(고정 경로 우선) | "칼럼"이라는 한글 검색어 자체는 못 먹음(칼럼은 검색어가 아니라 콘텐츠 담는 그릇이라 무방) |
| `/칼럼` | 허브 관례(한글 한 칸 주소)와 일관 | 중첩 동적 라우트 `/칼럼/[slug]` 에서 한글 인코딩 취급 주의 필요 |
| `/brand/column` | CEO컬럼이 옛 `/brand` 계열이었던 맥락과 이음 | 경로가 길고 브랜드소개 하위로 묻힘 |

- **권장**: 목록 `/column`, 상세 `/column/[slug]`. slug 는 한글 검색어 그대로 쓰지 말고
  **의미 있는 영/숫자 슬러그**(예: `sanggyeonrye-makeup`, `autumn-honju-hanbok`)로 둔다 — 문항 slug(`p5-09`)와 달리
  칼럼은 주제가 곧 검색어라 slug 를 읽기 좋게 유지하면 URL 자체가 SEO 자산이 된다.
- 옛 `/sub/sub01_03.php` 리다이렉트(`next.config.ts:52`)를 `/brand` → **`/column` 으로 되돌린다**
  (CEO컬럼의 옛 유입을 새 칼럼으로 회수).

### 3.2 허브·100문100답과의 역할 분담 (중복 콘텐츠 방지)
| | 검색어 허브 | 100문100답 | **CEO 칼럼** |
|---|---|---|---|
| 성격 | 대형 검색어 랜딩 | 유료 지식 상품 | 무료 정보·시의성 글 |
| 잡는 검색어 | `혼주한복`(월 16k) 같은 헤드 | 문항별 롱테일 | **계절/트렌드/사연형 롱테일** |
| 유료 | 무료(경계까지) | 유료 | 무료 |
| 분량 | 절 구성 + 문항 링크 | 문답 1개 | 800~1500자 에세이형 |
| 향하는 곳 | 문항·상담 | 상담·구매 | **허브·문항·상담(깔때기 맨 위)** |

→ 셋이 같은 답을 반복하지 않게, 칼럼은 "왜/언제/사연" 을 다루고 "어떻게(구체 처방)" 는 문항으로 링크한다.
각 페이지 `alternates.canonical` 로 자기 URL 을 못 박아 중복을 막는다(기존 페이지들이 이미 하는 방식).

---

## 4. 데이터 모델 — wed100 폴백 패턴 복제

### 4.1 파일 구성 (신규)
```
src/types/column.ts            Column 타입
src/lib/columns.ts             시드 로드 + 폴백 순수함수 + 헬퍼 (화면에서 import 가능)
src/lib/columns.server.ts      Admin SDK 접근 (firebase-admin, .server 분리)
src/data/columns.json          시드 폴백 (리포에 커밋)
```

### 4.2 타입(안)
```ts
export interface Column {
  slug: string;            // URL, 읽기 좋은 영/숫자 (예: 'sanggyeonrye-makeup')
  title: string;           // <h1> · <title>
  description: string;     // meta description · 카드 요약
  lead: string;            // 히어로 한두 줄
  body: string[];          // 문단 배열 (문항 answer[] 와 동일한 모양)
  keywords: string[];      // meta keywords · 내부 태깅
  heroImage?: string;      // 없으면 기본값
  author: string;          // 기본 '김성희' (대표원장)
  publishedAt: string;     // 발행일 (BlogPosting datePublished)
  updatedAt?: string;      // 수정일 (dateModified) — 거짓 날짜 금지
  relatedHubs?: string[];  // 관련 허브 slug (예: ['혼주메이크업'])
  relatedQna?: string[];   // 관련 문항 slug (예: ['p3-05'])
  published?: boolean;     // 기본 true, 비공개 초안 대응
}
```

### 4.3 저장 위치 (원장 결정 필요 — 8절)
| 방식 | 반영 | 결재 kind | 비고 |
|---|---|---|---|
| **Firestore `columns` 컬렉션 + 시드 폴백 (권장)** | 승인 즉시 반영, 배포 불필요 | `config`/신규 kind → 자동반영 | 100문100답과 같은 운영감. 푸시 전 `sync_seed` 로 시드 되돌리기 필요 |
| 시드 JSON 만(코드) | 배포해야 반영 | `code` → 수동 배포 | 단순하지만 글 하나 고치는데 배포가 필요 |

- **권장: Firestore 저장.** 원장·매니저가 배포 없이 칼럼을 올리고 고칠 수 있어야 콘텐츠가 실제로 쌓인다.
  단, wed100 규칙대로 **푸시 전 Firestore → 시드 되돌리기 스크립트**(`scripts/sync-columns-seed.py`, 신규)를 둔다 —
  안 하면 Firestore 가 잠깐 안 될 때 옛 목록으로 조용히 되돌아간다.
- 잠금 설정 없음(전면 무료)이라 100문100답의 `site_config/wed100`(paywall) 같은 별도 접근 문서는 불필요.

---

## 5. 화면·메타데이터·구조화 데이터

### 5.1 렌더링
- 손님용이므로 **`SiteShell` 안**에 놓는다. 톤은 100문100답 계열 `--w-*`(로즈) 토큰 재사용 또는
  `mfl-original.css` 중 택1 — 글 읽는 화면이니 큰 글자(5060 배려) 유지. `honjoo100/page.tsx` 목록 구조를 본뜬다.
- 목록 `/column/page.tsx`: `export const revalidate = 3600`, 서버에서 `getPublishedColumns()` 로드 →
  최신순 카드 → 하단 "100문100답 전체 보기" CTA. `CollectionPage`+`ItemList` JSON-LD(문항 목록 패턴 차용).
- 상세 `/column/[slug]/page.tsx`: `generateStaticParams`(전 칼럼), `generateMetadata`(title/description/keywords/
  canonical `/column/${slug}`/openGraph `type:'article'` + `OG_IMAGE`), `revalidate = 3600`.
  본문 → 관련 허브·문항 링크 → 상담 CTA.

### 5.2 JSON-LD — `BlogPosting` (신규, 100문100답 `Article` 이 참고 구현)
```jsonc
{
  "@type": "BlogPosting",
  "headline": "<title>",
  "description": "<description>",
  "datePublished": "<publishedAt>",
  "dateModified": "<updatedAt ?? publishedAt>",
  "author":   { "@type": "Person", "name": "김성희", "jobTitle": "대표원장" },
  "publisher": { "@id": "<SITE_URL>/#business" },   // seo.ts businessJsonLd 의 @id 참조
  "mainEntityOfPage": "<SITE_URL>/column/<slug>",
  "image": "<heroImage>",
  "isAccessibleForFree": true
}
```
+ `breadcrumbJsonLd(['홈','CEO 칼럼', <title>])` (기존 `src/lib/seo.ts` 헬퍼 재사용).
> `Article` 대신 `BlogPosting` 을 쓰는 이유: 칼럼은 시의성 글이라 블로그 엔티티가 검색엔진에 더 맞다.
> 스키마 `@id`·publisher 는 기존 사업자 스키마를 참조해 저자·발행자 신뢰 그래프를 잇는다.

### 5.3 sitemap / robots / redirect (반드시 갱신)
- `src/app/sitemap.ts`: `getPublishedColumns()` 를 더해 `/column`(0.7) + 각 `/column/${slug}`(0.6) 항목 추가.
  `lastModified` 는 칼럼 `updatedAt` 최신값에서(거짓 날짜 금지).
- `src/app/robots.ts`: 손대지 않아도 자동 허용(`/admin`·`/api` 만 disallow).
- `next.config.ts`: `/sub/sub01_03.php` → `/column` 으로 변경(301).

---

## 6. 어드민·운영 흐름

- **편집 화면** `/admin/column` 신규 — `Wed100Admin.tsx` 패턴(목록·편집 폼·저장 API + `verifyAdmin`) 축소 복제.
  저장 API `src/app/api/columns/route.ts`(`runtime='nodejs'`)는 반드시 `verifyAdmin({ idToken })` 통과 후 저장,
  저장 뒤 `revalidatePath('/column','layout')` + `/column/[slug]` + `/`(sitemap) 무효화.
- **네비게이션** `src/components/admin/AdminTabs.tsx` 의 `TABS` 에 "칼럼" 추가.
- **결재** 콘텐츠 변경은 `/admin/proposals` 제안으로. 승인하는 순간 그대로 쓰일 **최종 문장**을 제안에 담는다.
  Firestore 저장이면 승인 즉시 반영 + `columns_versions` 스냅샷(문항의 `wed100_versions` 패턴).
- **업무일지** 칼럼 발행/수정은 커밋 뒤 `scripts/worklog.py` 로 `/admin/worklog` 에 남긴다.
- **필자·역할** 글은 원장(김성희) 명의, 초안 다듬기는 매니저·에이전트 몫(CLAUDE.md 결재 원칙: 원장에게 최종 문장을 쓰게 하지 않는다).

---

## 7. 초기 콘텐츠 계획 (예시 12편 · 롱테일 우선)

`src/lib/seoKeywords.ts` 목표 검색어와 계절성을 엮어, 허브가 못 잡는 롱테일부터 채운다.

| # | 가제 | 노리는 검색 의도 | 링크할 곳 |
|---|---|---|---|
| 1 | 상견례 메이크업, 혼주 화장과 무엇이 다른가 | 상견례 화장 | 혼주메이크업 허브, p3 문항 |
| 2 | 가을 혼주 한복, 요즘 색 고르는 법 | 가을 혼주한복 색 | 혼주한복 허브 |
| 3 | 60대 피부, 결혼식날 무너지지 않는 화장의 조건 | 60대 혼주 화장 | p3 문항, 상담 |
| 4 | 신부 어머니·신랑 어머니, 메이크업이 갈리는 지점 | 신랑어머니 화장 | 혼주메이크업 허브 |
| 5 | 예식장 조명과 사진 — 왜 '그날' 얼굴이 달라 보일까 | 결혼식 사진 화장 | p6 문항 |
| 6 | 혼주 헤어, 한복과 드레스에서 다르게 가야 하는 이유 | 혼주 머리 | 혼주머리 허브 |
| 7 | 결혼식 한 달 전, 피부가 해야 할 일 | 결혼 전 피부관리 | 상담 |
| 8 | 퍼스널 컬러가 혼주 의상 선택을 어떻게 바꾸나 | 혼주 퍼스널컬러 | p5 문항 |
| 9 | 출장 메이크업, 샵과 무엇이 같고 다른가 | 출장 혼주메이크업 | 상담·예약 |
| 10 | 겹경사(형제 결혼)일 때 혼주 스타일 맞추기 | 겹경사 혼주 | 허브·상담 |
| 11 | 원장이 25년간 본 '가장 흔한 실패' 세 가지 | 혼주메이크업 후기/실패 | 100문100답 전체 |
| 12 | 예약부터 당일까지 — 혼주가 챙길 것들 (요약) | 혼주메이크업 준비 | 100문100답 목록 |

- **발행 주기**: 초기 12편을 2~3개월에 나눠 채우고 이후 월 1~2편(원장 결정 — 8절).
- 각 글은 800~1500자, 관련 허브 1개 + 문항 1~2개 + 상담 CTA 를 본문에 내부링크로 건다
  (→ 발행마다 `count-internal-links.py` 재실행·커밋).

---

## 8. 결정이 필요한 것 (원장/매니저)

착수 전에 정해야 할 갈림길. 나머지는 위 권장안대로 진행한다.

1. **경로** — `/column`(권장) / `/칼럼` / `/brand/column` 중?
2. **저장 위치** — Firestore + 시드 폴백(권장, 배포 없이 발행) / 시드 JSON 만(배포형)?
3. **섹션 이름·노출** — 손님 메뉴 라벨을 "CEO 칼럼" / "원장 칼럼" / "칼럼" 중 무엇으로, 어디(브랜드소개 옆? 상단 메뉴?)에 걸까?
4. **발행 편수·주기** — 오픈 시 몇 편으로 시작하고(예: 3편 vs 12편), 이후 주기는?
5. **필자 표기** — 전 글 "대표원장 김성희" 단일 명의로 통일할지?

---

## 9. 실행 로드맵 · 검증

| 단계 | 내용 | 산출물 |
|---|---|---|
| 0 | 본 기획안 결재 (8절 결정) | `/admin/proposals` 승인 |
| 1 | 데이터층 — `types/column.ts`, `lib/columns.ts`(+`.server.ts`), `data/columns.json` 시드 3편 | 폴백 동작(Firebase 없이 렌더) |
| 2 | 화면 — `/column`, `/column/[slug]` + `BlogPosting` JSON-LD + canonical | `npm run build` 통과 + 실제 화면 확인 |
| 3 | 색인 배선 — `sitemap.ts` 항목 추가, `next.config.ts` 리다이렉트 변경 | sitemap.xml 에 칼럼 URL 노출 |
| 4 | 어드민 — `/admin/column` 편집·저장 API(`verifyAdmin`), `AdminTabs` 탭, `columns_versions` | 배포 없이 발행/수정 |
| 5 | 운영 — 내부링크 스크립트 재실행·커밋, `sync-columns-seed.py`, worklog 기록 | 준비도에 링크 반영, 시드 최신화 |
| 6 | 콘텐츠 — 초기 12편 순차 발행 | 검색 유입·전환 KPI 측정 시작 |

**검증**: 테스트 프레임워크 없음 → `npm run build`(타입 오류) + 실제 화면 확인 + 시드만으로(Firebase 미설정) 렌더 확인.

---

## 10. 리스크·주의

- **중복 콘텐츠** — 칼럼이 허브·문항과 같은 답을 반복하면 서로 순위를 갉는다. 역할 분담(3.2) + canonical 로 방지.
- **유료 경계 침범** — 칼럼에 문항 답을 그대로 옮기면 유료 상품이 무너진다. "왜/언제" 까지만.
- **시드 되돌리기 누락** — Firestore 로 발행하고 시드에 안 넣으면, 폴백 순간 옛 목록이 뜬다(wed100 과 같은 함정).
- **내부링크 스크립트 미실행** — 링크를 걸고 `count-internal-links.py` 를 안 돌리면 준비도가 낡은 채로 남는다.
- **`.server` 분리 위반** — `columns.server.ts` 를 클라이언트 컴포넌트에서 import 하면 빌드가 깨진다.
- **거짓 날짜** — `publishedAt`/`updatedAt` 은 실제 발행·수정 시각으로. sitemap `lastModified` 가 이를 읽는다.
