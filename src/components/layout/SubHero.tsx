import Link from 'next/link'

/**
 * 원본 .sub-visual + #lnb 그대로.
 *  .sub-visual { height:350px } / .tit { 30px, 500, #fff, 세로 중앙 }
 *  #lnb { max-width:1460px; padding:0 30px; margin:50px auto 60px }
 *  .lnb ul li { max-width:230px } / a { height:60px; radius:30px; font-size:20px }
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
      <div className="sub-visual">
        <div
          className="background"
          style={{ backgroundImage: `url(${image})` }}
          role="img"
          aria-label={title}
        />
        <p className="tit">{title}</p>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="mfl-lnb">
          <div className="lnb">
            <ul>
              {tabs.map((t) => (
                <li key={t.name} className={t.name === active ? 'active' : undefined}>
                  <Link href={t.href} aria-current={t.name === active ? 'page' : undefined}>
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
