export interface Wed100Cue {
  i: number
  ko: string
  en?: string
  /** 오디오 내 시작 초 (TTS 생성 후 채워짐) */
  start?: number
  /** 오디오 내 종료 초 */
  end?: number
}

export interface Wed100Item {
  id: number
  slug: string
  part: number
  partTitle: string
  n: number
  question: string
  question_en?: string
  answer: string[]
  cues: Wed100Cue[]
  keywords: string[]
  /** 질문 낭독 구간 */
  questionAudio?: { start: number; end: number }
  /** 오디오 경로 (없으면 음성 미생성) */
  audio?: string
  /** 오디오 전체 길이(초) */
  duration?: number
  /** 대표 이미지 (기본값은 자동 생성 SVG, 어드민에서 사진으로 교체 가능) */
  heroImage?: string
  thumbImage?: string
  /** 배정된 사진 이름 (src/data/wed100-photos.json 의 name) */
  photo?: string
  /**
   * true  = 파트별 자동 배정 대상 (5_assign_photos.py 가 다시 배정할 수 있음)
   * false = 어드민에서 직접 고른 사진 — 자동 배정이 건드리지 않는다
   */
  photoAuto?: boolean
  published?: boolean
  updatedAt?: string
}

export interface Wed100Part {
  part: number
  title: string
  intro: string[]
}

export interface Wed100Data {
  meta: {
    title: string
    subtitle: string
    author: string
    generatedFrom: string
    totalQuestions: number
    languages: { content: string[]; subtitles: string[] }
  }
  parts: Wed100Part[]
  items: Wed100Item[]
}

export type SubtitleLang = 'ko' | 'en' | 'both'

/** PART별 테마 컬러 (SVG 일러스트 생성기와 동일한 팔레트) */
export const PART_THEME: Record<number, { accent: string; soft: string; label: string }> = {
  0: { accent: '#7A6A5F', soft: '#F2EEEA', label: '프롤로그' },
  1: { accent: '#A63D5A', soft: '#F6E9ED', label: '업체 선정 및 예약' },
  2: { accent: '#6E4477', soft: '#F1ECF5', label: '사전 컨설팅 및 준비' },
  3: { accent: '#B0475A', soft: '#FBEDEE', label: '혼주 메이크업' },
  4: { accent: '#3F6B57', soft: '#E9F0EC', label: '혼주 헤어스타일' },
  5: { accent: '#9A7B33', soft: '#F7F0E0', label: '의상·퍼스널컬러·액세서리' },
  6: { accent: '#3C5A86', soft: '#E9EEF6', label: '결혼식 당일' },
  7: { accent: '#7A6A5F', soft: '#F2EEEA', label: '에필로그' },
}
