'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

export default function HeroSection() {
  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative bg-gradient-to-br from-[#FDF4F3] via-white to-[#FDF4F3] py-20 lg:py-32 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#F8C3BF] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center">
          {/* Award Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F8C3BF] bg-white/80 px-4 py-2 text-sm text-[#F46E65] shadow-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F46E65] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FDF4F3]0"></span>
            </span>
            1:1 사전컨설팅 상담 시스템
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            <span className="block">나를 빛나게 하는 시간</span>
            <span className="block text-[#F46E65] mt-2">메이크업포엘</span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            메이크업 전 전문가의 <span className="font-semibold text-[#F46E65]">1:1 사전 컨설팅</span>을 통해
            <br />
            퍼스널컬러 진단, 어울리는 헤어스타일 점검 후 메이크업을 진행합니다.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/reservation">
              <Button size="lg" className="bg-[#F46E65] hover:bg-[#E2564C] text-lg px-8 py-6">
                예약 상담하기
              </Button>
            </Link>
            <Link href="/gallery">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-[#F46E65] text-[#F46E65] hover:bg-[#FDF4F3]">
                갤러리 둘러보기
              </Button>
            </Link>
          </div>

          {/* Contact Info */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold">전화문의</span>
              <Link href="tel:02-323-3321" className="text-[#F46E65] hover:text-[#E2564C] font-medium">
                02-323-3321
              </Link>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">카카오톡</span>
              <Link
                href="https://pf.kakao.com/_lXVVxb"
                target="_blank"
                className="text-[#F46E65] hover:text-[#E2564C] font-medium"
              >
                메이크업포엘
              </Link>
            </div>
          </div>

          {/* Scroll Indicator */}
          <button
            onClick={scrollToServices}
            className="mt-16 inline-flex flex-col items-center text-gray-400 hover:text-[#F46E65] transition-colors animate-bounce"
          >
            <span className="text-sm mb-2">자세히 보기</span>
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  )
}
