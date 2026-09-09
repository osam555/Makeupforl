/*
  서비스 워커.

  서비스 워커는 잘못 만들면 사이트 전체가 옛 화면에 갇힌다. 한 번 자리를 잡으면
  사람들 기기에 남아, 새로 배포해도 옛것을 계속 보여 준다. 그래서 최소한만 한다.

  - 화면(HTML) 은 언제나 서버를 먼저 본다. 캐시는 인터넷이 끊겼을 때만 쓴다.
    100문100답은 값이 바뀌고 잠금도 바뀌므로 옛 화면을 보여 주면 안 된다.
  - 정적 파일(/_next/static, /icons)만 캐시를 먼저 본다. 이 파일들은 이름에
    해시가 들어 있어 내용이 바뀌면 이름도 바뀐다 — 옛것을 줄 위험이 없다.
  - 그 밖의 것(API·이미지 최적화·Firestore)은 아예 건드리지 않는다.

  캐시 이름에 판올림 번호를 둔다. 이 번호를 올리면 옛 캐시가 지워진다.
*/
const VERSION = 'mfl-v1'
const STATIC = `${VERSION}-static`
const PAGES = `${VERSION}-pages`
const OFFLINE = '/offline'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // 관리 화면과 API 는 캐시에 남기지 않는다 — 로그인 상태와 잠금이 걸려 있다
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return
  if (url.pathname.startsWith('/_next/image')) return

  // 이름에 해시가 든 정적 파일 — 캐시 먼저
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons')) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC).then((c) => c.put(request, copy))
            }
            return res
          }),
      ),
    )
    return
  }

  // 화면 — 서버 먼저, 끊겼을 때만 캐시
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(PAGES).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE))),
    )
  }
})
