'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getDb } from '@/lib/firebase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GalleryImage {
  id: string
  url: string
  alt_text: string | null
  /** 카테고리 슬러그 (all | wedding | honju | party …) */
  category?: string
  order_position: number
}

interface GalleryGridProps {
  category: string
}

export default function GalleryGrid({ category }: GalleryGridProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  useEffect(() => {
    loadImages()
  }, [category])

  async function loadImages() {
    setLoading(true)

    try {
      const db = getDb()
      if (!db) throw new Error('firebase-not-configured')
      const { collection, getDocs, orderBy, query, where } = await import('firebase/firestore')
      const base = collection(db, 'gallery_images')
      const q =
        category !== 'all'
          ? query(base, where('category', '==', category), orderBy('order_position', 'asc'))
          : query(base, orderBy('order_position', 'asc'))
      const snap = await getDocs(q)
      setImages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GalleryImage))
    } catch (error) {
      console.error('Error:', error)
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const openModal = (index: number) => {
    setSelectedImage(index)
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  const goToPrevious = () => {
    if (selectedImage !== null && selectedImage > 0) {
      setSelectedImage(selectedImage - 1)
    }
  }

  const goToNext = () => {
    if (selectedImage !== null && selectedImage < images.length - 1) {
      setSelectedImage(selectedImage + 1)
    }
  }

  // Sample placeholder images for demo
  const placeholderImages = Array.from({ length: 12 }, (_, i) => ({
    id: `placeholder-${i}`,
    url: `https://picsum.photos/seed/${category}-${i}/800/600`,
    alt_text: `${category} 메이크업 ${i + 1}`,
    gallery_id: 'placeholder',
    order_position: i,
  }))

  const displayImages = images.length > 0 ? images : placeholderImages

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (displayImages.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">아직 등록된 이미지가 없습니다.</p>
      </div>
    )
  }

  return (
    <>
      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayImages.map((image, index) => (
          <div
            key={image.id}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100 cursor-pointer hover:shadow-xl transition-all duration-300"
            onClick={() => openModal(index)}
          >
            <Image
              src={image.url}
              alt={image.alt_text || '갤러리 이미지'}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      <Dialog open={selectedImage !== null} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-7xl w-full p-0 bg-black/95 border-none">
          {selectedImage !== null && (
            <div className="relative w-full h-[90vh]">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
                onClick={closeModal}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Previous Button */}
              {selectedImage > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              {/* Next Button */}
              {selectedImage < displayImages.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}

              {/* Image */}
              <div className="relative w-full h-full flex items-center justify-center p-12">
                <Image
                  src={displayImages[selectedImage].url}
                  alt={displayImages[selectedImage].alt_text || '갤러리 이미지'}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-full text-sm">
                {selectedImage + 1} / {displayImages.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
