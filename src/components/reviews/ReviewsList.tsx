'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import reviewsSeed from '@/data/reviews.json'
import { getDb } from '@/lib/firebase/client'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Review {
  id: string
  title: string
  imageUrl: string
  created_at: string
}

const SEED: Review[] = (
  reviewsSeed as { items: { id: string; title: string; date: string; url: string }[] }
).items.map((r) => ({ id: r.id, title: r.title, imageUrl: r.url, created_at: r.date }))

export default function ReviewsList() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<number | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const db = getDb()
      if (!db) throw new Error('firebase-not-configured')
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'reviews'))
      const rows = snap.docs
        .map((d) => {
          const v = d.data() as Partial<Review> & { url?: string; published?: boolean }
          return {
            id: d.id,
            title: v.title ?? '고객후기',
            imageUrl: v.imageUrl ?? v.url ?? '',
            created_at: v.created_at ?? '',
            published: v.published !== false,
          }
        })
        .filter((r) => r.imageUrl && r.published)
        .sort((a, b) => (b.created_at > a.created_at ? 1 : -1) || b.id.localeCompare(a.id))
      setReviews(rows.length > 0 ? rows : SEED)
    } catch {
      setReviews(SEED)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    )
  }

  if (reviews.length === 0) {
    return <p className="py-16 text-center text-gray-500">등록된 후기가 없습니다.</p>
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {reviews.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setSel(i)}
            className="group overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative aspect-[3/4] bg-gray-50">
              <Image
                src={r.imageUrl}
                alt={r.title}
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                className="object-cover object-top transition group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex items-center justify-between px-3.5 py-3">
              <span className="text-sm font-semibold text-gray-900">{r.title}</span>
              <span className="text-[13px] text-gray-600">{r.created_at}</span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={sel !== null} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="w-full max-w-3xl border-none bg-black/95 p-0">
          {sel !== null && (
            <div className="relative h-[88vh] w-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 text-white hover:bg-white/20"
                onClick={() => setSel(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              {sel > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={() => setSel(sel - 1)}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}
              {sel < reviews.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={() => setSel(sel + 1)}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}
              <div className="relative h-full w-full p-10">
                <Image
                  src={reviews[sel].imageUrl}
                  alt={reviews[sel].title}
                  fill
                  sizes="100vw"
                  priority
                  className="object-contain"
                />
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
                {reviews[sel].title} · {reviews[sel].created_at} ({sel + 1}/{reviews.length})
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
