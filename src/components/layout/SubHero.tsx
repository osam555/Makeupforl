import Link from 'next/link'

/**
 * 원본 홈페이지와 동일한 서브페이지 상단.
 * 실측: .sub-visual { height:350px } / .tit { 30px, 500, #fff, 세로 중앙 }
 *       background-position: 25% 50%, background-size: cover
 *       탭 220×50, radius 25, 활성 #F46E65, 간격 10px, 가운데 정렬
 */
export default function SubHero({
  title,
  image,
  tabs,
  active,
}: {
  title: string
  image: string
  tabs?: { name: string; href: string }[]
  active?: string
}) {
  return (
    <>
      <div className="mfl-subvis">
        <div
          className="mfl-subvis-bg"
          style={{ backgroundImage: `url(${image})` }}
          role="img"
          aria-label={title}
        />
        <p className="mfl-subvis-tit">{title}</p>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="pt-[53px]">
          <div className="mfl-contain">
            <nav className="mfl-tabs">
              {tabs.map((t) => (
                <Link
                  key={t.name}
                  href={t.href}
                  className="mfl-tab"
                  aria-current={t.name === active ? 'page' : undefined}
                >
                  {t.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
