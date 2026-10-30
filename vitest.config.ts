import path from 'node:path'
import { defineConfig } from 'vitest/config'

// 테스트는 상담 신청처럼 개인정보를 받는 곳부터 붙였다(2026-10-30). 나머지는 여전히 build + 화면 확인.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node' },
})
