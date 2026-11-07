import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    /*
      옛 PHP 사이트를 통째로 내려받아 둔 사본.

      주소 표(next.config.ts 의 301)와 이식한 CSS 의 출처라 지우지 않고 두었지만,
      우리가 고칠 코드는 아니다. 안에 든 것은 jQuery·slick·wow 같은 남의 라이브러리
      최소화본이고, 그것만으로 오류 145건이 나 정작 우리 코드의 오류가 묻혔다.
    */
    "archive/**",

    /*
      쇼츠 만드는 도구(Remotion·HyperFrames). 사이트와 따로 npm 을 깔고 따로 돈다 —
      사이트 규칙(next/core-web-vitals)으로 검사하면 <img> 경고 따위가 우리 코드 오류를 덮는다.
    */
    "video/**",
  ]),
]);

export default eslintConfig;
