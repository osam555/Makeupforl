// 실행: node --test src/lib/trackSource.test.ts  (Node 22.6+ 는 타입을 벗겨 바로 돌린다)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromTag } from './trackSource.ts'

test('쇼츠 프로필 링크의 ?from=yt 는 youtube-shorts 출처가 된다', () => {
  assert.equal(fromTag('yt'), 'youtube-shorts')
})

test('모르는 꼬리표는 받지 않는다 — 아무 문자열이나 문서 열쇠가 되면 안 된다', () => {
  assert.equal(fromTag(''), null)
  assert.equal(fromTag('__proto__'), null)
  assert.equal(fromTag('toString'), null)
})
