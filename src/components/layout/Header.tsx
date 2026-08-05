'use client'

import Link from 'next/link'
import { useState } from 'react'
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

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="text-2xl font-bold text-pink-600">메이크업포엘</span>
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
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-pink-600 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Contact button */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Link href="tel:02-323-3321">
            <Button className="bg-pink-600 hover:bg-pink-700">
              02-323-3321
            </Button>
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
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-900 hover:bg-pink-50 hover:text-pink-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="tel:02-323-3321"
              className="block rounded-md bg-pink-600 px-3 py-2 text-center text-base font-medium text-white hover:bg-pink-700"
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
