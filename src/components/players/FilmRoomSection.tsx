'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui'
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeThumbnail, getVideoType } from '@/lib/video'

interface VideoItem {
  id: string
  url: string
  title: string | null
  thumbnail: string | null
}

interface FilmRoomSectionProps {
  videos: VideoItem[]
}

export default function FilmRoomSection({ videos }: FilmRoomSectionProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)

  const ytId = selectedVideo ? extractYouTubeId(selectedVideo.url) : null

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {videos.map((video, index) => {
          const videoYtId = extractYouTubeId(video.url)
          const thumbUrl = video.thumbnail || (videoYtId ? getYouTubeThumbnail(videoYtId) : null)

          return (
            <button
              key={video.id}
              type="button"
              onClick={() => setSelectedVideo(video)}
              className="group relative aspect-video bg-page-bg rounded-sm overflow-hidden border border-border-default cursor-pointer text-left"
            >
              {thumbUrl && (
                <Image
                  src={thumbUrl}
                  alt={video.title || 'Video'}
                  fill
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1D37] to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 bg-eha-red rounded-full flex items-center justify-center text-white shadow-xl shadow-eha-red/20 transform group-hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-white border-b-8 border-b-transparent ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                {index === 0 && (
                  <span className="inline-block text-[10px] font-extrabold text-eha-red uppercase tracking-widest bg-white px-2 py-0.5 rounded-sm mb-2">
                    Featured
                  </span>
                )}
                <p className="text-white font-bold truncate">
                  {video.title || 'Highlight Video'}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Video Player Modal */}
      <Modal
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        title={selectedVideo?.title || 'Film Room'}
        size="xl"
      >
        {selectedVideo && ytId ? (
          <div className="aspect-video w-full">
            <iframe
              src={`${getYouTubeEmbedUrl(ytId)}?autoplay=1`}
              className="w-full h-full rounded-sm"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : selectedVideo ? (
          <div className="text-center py-8">
            <p className="text-text-muted mb-4">This video is hosted externally</p>
            <a href={selectedVideo.url} target="_blank" rel="noopener noreferrer">
              <Button className="inline-flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Watch on {getVideoType(selectedVideo.url) === 'hudl' ? 'Hudl' : 'External Site'}
              </Button>
            </a>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
