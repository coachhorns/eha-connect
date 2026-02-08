export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

export function isHudlUrl(url: string): boolean {
  return url.includes('hudl.com')
}

export function getVideoType(url: string): 'youtube' | 'hudl' | 'other' {
  if (extractYouTubeId(url)) return 'youtube'
  if (isHudlUrl(url)) return 'hudl'
  return 'other'
}
