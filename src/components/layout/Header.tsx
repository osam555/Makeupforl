'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: '브랜드소개', href: '/brand' },
  { name: '혼주메이크업 100문100답', href: '/wed100' },
  { name: '샵 / 출장메이크업', href: '/services' },
  { name: '1:1 사전컨설팅', href: '/consultation' },
  { name: '갤러리', href: '/gallery' },
  { name: '예약안내', href: '/reservation' },
  { name: '고객후기', href: '/reviews' },
  { name: '교육자료', href: '/education' },
]

export default function Header({ logo }: { logo?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  /** 로고를 빠르게 두 번(모바일은 세 번) 누르면 관리자 화면으로 이동 */
  const tapRef = useRef<{ n: number; t: number }>({ n: 0, t: 0 })
  const handleLogoTap = () => {
    const now = Date.now()
    const s = tapRef.current
    s.n = now - s.t < 600 ? s.n + 1 : 1
    s.t = now
    if (s.n >= 2) {
      s.n = 0
      router.push('/admin/wed100')
    }
  }

  return (
    <header className="sticky top-0 z-[90] w-full bg-white">
      <nav
        className="mfl-contain mfl-contain-wide flex h-20 items-center justify-between xl:h-[100px]"
        aria-label="Global"
      >
        {/* Logo */}
        <div className="flex">
          <Link
            href="/"
            className="-m-1.5 p-1.5 select-none"
            onClick={(e) => {
              // 두 번 연속 탭이면 관리자 화면으로 (일반 클릭은 홈으로)
              const s = tapRef.current
              const now = Date.now()
              if (now - s.t < 600 && s.n >= 1) {
                e.preventDefault()
              }
              handleLogoTap()
            }}
            title="메이크업포엘"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo || "https://makeupforl.co.kr/images/common/logo_on.png"}
              alt="메이크업포엘"
              width={130}
              height={20}
              className="h-5 w-auto"
            />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <Button
            variant="ghost"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5"
          >
            <span className="sr-only">메뉴 열기</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-x-9 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-[17px] font-medium tracking-[-0.16px] text-[#242424] transition-colors hover:text-[#F46E65]"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Contact button */}
        <div className="hidden lg:flex lg:justify-end">
          <Link href="tel:02-323-3321">
            <span className="flex h-[46px] w-[170px] items-center justify-center rounded-[23px] bg-[#F46E65] text-[16px] font-medium text-white transition hover:bg-[#E2564C]">
              02-323-3321
            </span>
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-[#FDF4F3] hover:text-[#F46E65]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="tel:02-323-3321"
              className="block rounded-md bg-[#F46E65] px-3 py-2 text-center text-base font-medium text-white hover:bg-[#E2564C]"
              onClick={() => setMobileMenuOpen(false)}
            >
              02-323-3321
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
