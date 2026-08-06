import Image from 'next/image'
import Link from 'next/link'

/**
 * 원본 홈페이지와 동일한 서브페이지 상단 구조.
 * 비주얼 배너(제목 오버레이) + 하위 탭 버튼.
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
      <div className="relative h-[220px] w-full overflow-hidden sm:h-[300px]">
        <Image
          src={image}
          alt={title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl font-semibold tracking-[0.06em] text-white drop-shadow-lg sm:text-4xl">
            {title}
          </h1>
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3 px-6 py-7 lg:px-8">
            {tabs.map((t) => {
              const on = t.name === active
              return (
                <Link
                  key={t.name}
                  href={t.href}
                  className={`min-w-[130px] rounded-full border px-6 py-3 text-center text-sm font-medium transition ${
                    on
                      ? 'border-pink-500 bg-pink-500 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-pink-300 hover:text-pink-600'
                  }`}
                >
                  {t.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
