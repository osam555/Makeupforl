'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * 이 기기에 남기는 값 (localStorage) 읽기.
 *
 * 곳곳에서 같은 모양을 되풀이하고 있었다 — 기본값으로 한 번 그리고, 마운트된 뒤
 * useEffect 에서 저장된 값을 읽어 setState 로 다시 그린다. 서버가 그린 화면과
 * 어긋나지 않으려면 그래야 했지만, 화면을 두 번 그리는 값이고 React 19 의
 * set-state-in-effect 규칙에도 걸린다.
 *
 * useSyncExternalStore 가 바로 이 자리를 위한 것이다. 서버·수화(hydration) 때는
 * 기본값을, 그 뒤로는 저장된 값을 렌더 도중에 바로 돌려준다. 효과도, 두 번째
 * setState 도 없다.
 *
 * 덤으로 값을 여러 곳에서 함께 본다. 전에는 훅을 부르는 자리마다 제 상태를 들고
 * 있어서, 한쪽에서 글자 크기를 바꿔도 다른 쪽은 몰랐다. 다른 탭에서 바꾼 것도
 * storage 이벤트로 따라온다.
 */

const subs = new Set<() => void>()

/**
 * 저장이 막힌 브라우저(사파리 프라이빗 모드 등)를 위한 덮개.
 *
 * localStorage 에 못 쓰더라도 "이번 화면에는 적용된다" 는 약속은 지켜야 한다.
 * 그래서 고른 값을 여기에도 들고 있다가 읽을 때 먼저 본다.
 */
const override = new Map<string, string>()

function emit() {
  for (const f of subs) f()
}

function subscribe(f: () => void): () => void {
  subs.add(f)
  window.addEventListener('storage', f)
  return () => {
    subs.delete(f)
    window.removeEventListener('storage', f)
  }
}

export function readStored(key: string): string | null {
  const own = override.get(key)
  if (own !== undefined) return own
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string): void {
  override.set(key, value)
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* 못 남겨도 이번 화면에는 적용된다 — override 가 들고 있다 */
  }
  emit()
}

/**
 * 정해진 몇 가지 중 하나를 이 기기에 남긴다 (테마·글자 크기 같은 것).
 *
 * `allow` 는 모듈 바깥에 상수로 두고 넘길 것. 렌더마다 새 배열을 만들어 넘겨도
 * 동작은 하지만, 읽는 함수가 매번 새로 만들어져 헛일을 한다.
 */
export function useStoredChoice<T extends string>(
  key: string,
  fallback: T,
  allow: readonly T[],
): [T, (v: T) => void] {
  const get = useCallback((): T => {
    const v = readStored(key)
    return v !== null && (allow as readonly string[]).includes(v) ? (v as T) : fallback
  }, [key, fallback, allow])

  const server = useCallback(() => fallback, [fallback])
  const value = useSyncExternalStore(subscribe, get, server)
  const set = useCallback((v: T) => writeStored(key, v), [key])

  return [value, set]
}

/**
 * 저장해 둔 JSON 을 읽기만 한다.
 *
 * 같은 문자열이면 같은 객체를 돌려준다. useSyncExternalStore 는 렌더마다 값을
 * 다시 물어보고 Object.is 로 견주므로, 매번 새 객체를 만들면 "값이 계속 바뀐다"
 * 며 무한히 다시 그린다.
 *
 * `fallback` 과 `parse` 도 모듈 바깥의 상수여야 한다.
 */
const parsed = new Map<string, { raw: string; value: unknown }>()

export function useStoredJson<T>(key: string, fallback: T, parse: (raw: string) => T | null): T {
  const get = useCallback((): T => {
    const raw = readStored(key)
    if (raw === null) return fallback
    const hit = parsed.get(key)
    if (hit && hit.raw === raw) return hit.value as T
    let value = fallback
    try {
      value = parse(raw) ?? fallback
    } catch {
      /* 남아 있던 값이 깨졌으면 없는 셈 친다 */
    }
    parsed.set(key, { raw, value })
    return value
  }, [key, fallback, parse])

  const server = useCallback(() => fallback, [fallback])
  return useSyncExternalStore(subscribe, get, server)
}

/**
 * 수화가 끝났는가.
 *
 * 서버가 그린 화면과 같아야 하는 동안에는 false, 브라우저가 넘겨받은 뒤에는 true.
 * "저장된 값을 알기 전까지는 감춰 둔다" 같은 자리에 쓴다.
 */
const noSubscribe = () => () => {}
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  )
}
