'use client'

import { useStoredChoice } from '@/lib/stored'

const KEY = 'mfl:adminFont'
export type FontSize = 'normal' | 'large' | 'xlarge'
const SIZES: readonly FontSize[] = ['normal', 'large', 'xlarge']

/**
 * 어드민 글자 크기.
 *
 * 기본을 '크게' 로 둔다. 이 화면을 매일 보시는 분이 쉰을 넘기셨고, 대개
 * 휴대전화로 여신다. 촘촘한 관리 화면은 만든 사람 눈에나 편하다.
 *
 * 크기를 바꾸는 방법으로 rem 을 쓴다. 화면 곳곳의 글자 크기를 하나씩 고치는 대신
 * 뿌리 글자 크기를 키우면, 그에 맞춰 여백과 아이콘까지 함께 커진다 — 글자만
 * 커지고 칸은 그대로면 오히려 더 답답해진다.
 *
 * 처음에는 두 단계(16 / 17.6px)였다. 1.1 배는 눈이 좋은 사람에게나 차이라 "충분히
 * 크지 않다" 는 말을 들었고, 맞는 말이었다. 지금은 16 / 20 / 24px 세 단계다.
 * 뿌리만 키우면 작은 이름표가 여전히 작아, admin-theme.css 에서 작은 글씨를
 * 더 많이 키운다.
 *
 * 고른 값은 이 기기에 남는다. 서버에 두지 않는 이유는, 큰 화면과 휴대전화에서
 * 원하는 크기가 다르기 때문이다.
 *
 * 고르는 단추는 설정 패널(AdminSettings)에 있다. 화면 위에 늘 펼쳐 두던 것을
 * 접어 넣었다 — 한 번 정하면 다시 만질 일이 드문 것이 자리를 차지하고 있었다.
 */
export function useFontSize(): [FontSize, (v: FontSize) => void] {
  return useStoredChoice(KEY, 'large', SIZES)
}
