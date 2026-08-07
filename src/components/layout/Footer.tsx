import Link from 'next/link'
import { Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#F46E65] text-white">
      <div className="mfl-contain mfl-contain-wide pb-[55px] pt-[52px] text-[15px] leading-[1.467]">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Company Info */}
          <div>
            <h3 className="mb-4 text-[17px] font-medium text-white">메이크업포엘</h3>
            <div className="space-y-2 text-[15px]">
              <p>대표자: 김성희</p>
              <p>사업자등록번호: 143-08-02484</p>
              <p>통신판매업 신고번호: 2017-서울마포-0578</p>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-[17px] font-medium text-white">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a href="tel:02-323-3321" className="hover:opacity-70 transition-colors">
                  02-323-3321
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:makeupforl@naver.com" className="hover:opacity-70 transition-colors">
                  makeupforl@naver.com
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1" />
                <p className="text-[15px]">
                  서울시 강남구 논현로 158길14<br />
                  영빌딩 3층
                </p>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="mb-4 text-[17px] font-medium text-white">영업시간</h3>
            <div className="space-y-2 text-[15px]">
              <p>평일: 09:00 ~ 22:00</p>
              <p>토요일: 09:00 ~ 18:00</p>
              <p>일요일: 10:00 ~ 17:00</p>
              <div className="mt-4 pt-4 border-t border-white/25">
                <p className="font-medium text-white">
                  모든 과정은 100% 예약제로 진행됩니다
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Copyright */}
        <div className="mt-8 border-t border-white/25 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-6 text-[15px]">
            <Link href="/privacy" className="hover:opacity-70 transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="hover:opacity-70 transition-colors">
              이용약관
            </Link>
          </div>
          <p className="text-[15px] text-white/80">
            COPYRIGHT 2024 MAKEUPFORL. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  )
}
