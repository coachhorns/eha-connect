'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoItem {
  id: string
  url: string
  title: string | null
}

interface PhotoGalleryProps {
  photos: PhotoItem[]
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handlePrev = () => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1)
  }

  const handleNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex(selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0)
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {photos.slice(0, 4).map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="relative aspect-square rounded-sm overflow-hidden bg-surface-glass border border-border-default cursor-pointer group"
          >
            <Image
              src={item.url}
              alt={item.title || 'Player Photo'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedIndex(null)}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={() => setSelectedIndex(null)}
            className="absolute top-6 right-6 z-10 p-2 text-white/70 hover:text-white hover:bg-surface-overlay rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 z-10 p-2 text-white/70 hover:text-white hover:bg-surface-overlay rounded-full transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 z-10 p-2 text-white/70 hover:text-white hover:bg-surface-overlay rounded-full transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          {/* Image */}
          <div className="relative z-10 flex items-center justify-center mx-4 max-w-4xl max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[selectedIndex].url}
              alt={photos[selectedIndex].title || 'Player Photo'}
              className="max-w-full max-h-[85vh] object-contain rounded-sm"
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/60 text-xs font-bold uppercase tracking-widest">
            {selectedIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  )
}
