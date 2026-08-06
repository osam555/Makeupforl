import { Metadata } from 'next'
import GalleryClient from '@/components/gallery/GalleryClient'

export const metadata: Metadata = {
  title: '갤러리 | 메이크업포엘',
  description: '메이크업포엘의 다양한 메이크업 포트폴리오를 확인하세요. 혼주, 가족·하객, 웨딩, 남자 메이크업, 기업행사·영상, 화보·프로필',
}

export default function GalleryPage() {
  return <GalleryClient />
}
