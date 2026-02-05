'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import {
  ArrowLeft,
  Camera,
  Loader2,
  Shield,
  GraduationCap,
  MapPin,
  Users,
  ExternalLink,
  Trash2,
  Plus,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Upload,
  X,
} from 'lucide-react'
import { Card, Button, Input } from '@/components/ui'
import { formatHeight, formatPosition } from '@/lib/utils'

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.crossOrigin = 'anonymous'
    image.src = url
  })
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const radians = (rotation * Math.PI) / 180

  // Calculate bounding box of the rotated image
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  const newWidth = image.width * cos + image.height * sin
  const newHeight = image.width * sin + image.height * cos

  // Set canvas to the size of the crop output
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Translate and rotate around center of the full image, then draw
  ctx.translate(-pixelCrop.x, -pixelCrop.y)
  ctx.translate(newWidth / 2, newHeight / 2)
  ctx.rotate(radians)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob failed'))
    }, 'image/jpeg', 0.92)
  })
}

interface MediaItem {
  id: string
  type: 'PHOTO' | 'VIDEO' | 'HIGHLIGHT'
  url: string
  title: string | null
  uploadedAt: string
}

interface TeamRoster {
  id: string
  team: { name: string; slug: string }
}

interface PlayerData {
  id: string
  slug: string
  firstName: string
  lastName: string
  profilePhoto: string | null
  primaryPosition: string | null
  secondaryPosition: string | null
  jerseyNumber: string | null
  heightFeet: number | null
  heightInches: number | null
  weight: number | null
  school: string | null
  city: string | null
  state: string | null
  graduationYear: number | null
  isVerified: boolean
  bio: string | null
  email: string | null
  twitterHandle: string | null
  instagramHandle: string | null
  hudlUrl: string | null
  youtubeUrl: string | null
  highlightUrl: string | null
  gpa: number | null
  transcriptUrl: string | null
  media: MediaItem[]
  teamRosters: TeamRoster[]
}

export default function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()

  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const photoInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  // Editable form fields
  const [bio, setBio] = useState('')
  const [email, setEmail] = useState('')
  const [twitterHandle, setTwitterHandle] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [hudlUrl, setHudlUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [highlightUrl, setHighlightUrl] = useState('')
  const [gpa, setGpa] = useState('')
  const [transcriptUrl, setTranscriptUrl] = useState('')
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false)
  const transcriptInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/dashboard/players/${resolvedParams.id}/edit`)
    }
  }, [status, router, resolvedParams.id])

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const res = await fetch(`/api/user/players/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          const p: PlayerData = data.player
          setPlayer(p)
          setBio(p.bio || '')
          setEmail(p.email || '')
          setTwitterHandle(p.twitterHandle || '')
          setInstagramHandle(p.instagramHandle || '')
          setHudlUrl(p.hudlUrl || '')
          setYoutubeUrl(p.youtubeUrl || '')
          setHighlightUrl(p.highlightUrl || '')
          setGpa(p.gpa ? String(p.gpa) : '')
          setTranscriptUrl(p.transcriptUrl || '')
        } else if (res.status === 404 || res.status === 403) {
          setError('Player not found or access denied')
        } else {
          setError('Failed to load player')
        }
      } catch (err) {
        console.error('Error fetching player:', err)
        setError('Failed to load player')
      } finally {
        setIsLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchPlayer()
    }
  }, [session, resolvedParams.id])

  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
    }
    reader.readAsDataURL(file)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handleCropCancel = () => {
    setCropImageSrc(null)
    setCroppedAreaPixels(null)
  }

  const handleCropConfirm = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return

    setIsUploadingPhoto(true)
    setError('')

    try {
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels, rotation)
      const file = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'players/profiles')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        setError(data.error || 'Upload failed')
        return
      }

      const { url } = await uploadRes.json()

      const updateRes = await fetch(`/api/user/players/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhoto: url }),
      })

      if (updateRes.ok) {
        const data = await updateRes.json()
        setPlayer(prev => prev ? { ...prev, profilePhoto: data.player.profilePhoto } : null)
      } else {
        setError('Failed to update profile photo')
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError('Failed to upload photo')
    } finally {
      setIsUploadingPhoto(false)
      setCropImageSrc(null)
      setCroppedAreaPixels(null)
    }
  }

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB')
      return
    }

    setIsUploadingMedia(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'players/media')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        setError(data.error || 'Upload failed')
        return
      }

      const { url } = await uploadRes.json()

      // Create media entry
      const mediaRes = await fetch(`/api/user/players/${resolvedParams.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, type: 'PHOTO', title: file.name }),
      })

      if (mediaRes.ok) {
        const data = await mediaRes.json()
        setPlayer(prev => prev ? { ...prev, media: [data.media, ...prev.media] } : null)
      } else {
        setError('Failed to save media')
      }
    } catch (err) {
      console.error('Error uploading media:', err)
      setError('Failed to upload media')
    } finally {
      setIsUploadingMedia(false)
      if (mediaInputRef.current) mediaInputRef.current.value = ''
    }
  }

  const handleDeleteMedia = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/user/players/${resolvedParams.id}/media?mediaId=${mediaId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setPlayer(prev => prev ? { ...prev, media: prev.media.filter(m => m.id !== mediaId) } : null)
      } else {
        setError('Failed to delete media')
      }
    } catch (err) {
      console.error('Error deleting media:', err)
      setError('Failed to delete media')
    }
  }

  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('PDF must be less than 10MB')
      return
    }

    setIsUploadingTranscript(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'players/transcripts')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        setError(data.error || 'Upload failed')
        return
      }

      const { url } = await uploadRes.json()
      setTranscriptUrl(url)

      // Save immediately to the player record
      const updateRes = await fetch(`/api/user/players/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptUrl: url }),
      })

      if (updateRes.ok) {
        setPlayer(prev => prev ? { ...prev, transcriptUrl: url } : null)
        setSuccess('Transcript uploaded successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError('Failed to save transcript')
      }
    } catch (err) {
      console.error('Error uploading transcript:', err)
      setError('Failed to upload transcript')
    } finally {
      setIsUploadingTranscript(false)
      if (transcriptInputRef.current) transcriptInputRef.current.value = ''
    }
  }

  const handleRemoveTranscript = async () => {
    try {
      const res = await fetch(`/api/user/players/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptUrl: null }),
      })

      if (res.ok) {
        setTranscriptUrl('')
        setPlayer(prev => prev ? { ...prev, transcriptUrl: null } : null)
      } else {
        setError('Failed to remove transcript')
      }
    } catch (err) {
      console.error('Error removing transcript:', err)
      setError('Failed to remove transcript')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/user/players/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio.trim() || null,
          email: email.trim() || null,
          twitterHandle: twitterHandle.trim() || null,
          instagramHandle: instagramHandle.trim() || null,
          hudlUrl: hudlUrl.trim() || null,
          youtubeUrl: youtubeUrl.trim() || null,
          highlightUrl: highlightUrl.trim() || null,
          gpa: gpa ? parseFloat(gpa) : null,
        }),
      })

      if (res.ok) {
        setSuccess('Profile updated successfully')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      console.error('Error updating player:', err)
      setError('Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-eha-red border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !player) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 text-eha-red hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!player) return null

  const currentTeam = player.teamRosters.find((r: any) => !r.leftAt)
  const photos = player.media.filter(m => m.type === 'PHOTO')

  return (
    <div className="min-h-screen">
      {/* Back link */}
      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Hero Section — matches public profile */}
      <div className="relative bg-gradient-to-br from-[#0A1D37] to-[#152e50] border-b border-white/5 py-12 lg:py-16">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Player Photo — clickable for upload */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative w-48 h-60 lg:w-56 lg:h-64 rounded-sm overflow-hidden bg-[#1a3a6e] border-4 border-white/10 mx-auto lg:mx-0 group cursor-pointer shadow-2xl"
                disabled={isUploadingPhoto}
              >
                {player.profilePhoto ? (
                  <Image
                    src={player.profilePhoto}
                    alt={`${player.firstName} ${player.lastName}`}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/30">
                    <Users className="w-20 h-20" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-white mx-auto mb-1" />
                      <span className="text-white text-sm font-medium">Change Photo</span>
                    </div>
                  )}
                </div>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleProfilePhotoSelect}
              />
            </div>

            {/* Player Info — read-only display */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-3">
                {player.graduationYear && (
                  <span className="px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20">
                    Class of {player.graduationYear}
                  </span>
                )}
                {player.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30">
                    <Shield className="w-3 h-3" />
                    Verified
                  </span>
                )}
                {player.primaryPosition && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white/60 border border-white/20">
                    {formatPosition(player.primaryPosition)}
                  </span>
                )}
                {player.jerseyNumber && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-white/10 text-gray-300 border border-white/20">
                    #{player.jerseyNumber}
                  </span>
                )}
              </div>

              <h1 className="text-5xl lg:text-7xl tracking-tighter font-bold text-white uppercase">
                {player.firstName} <span className="text-white/90">{player.lastName}</span>
              </h1>

              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-white/60 font-bold text-sm uppercase tracking-widest">
                {player.primaryPosition && (
                  <span>{formatPosition(player.primaryPosition)}</span>
                )}
                {player.heightFeet && (
                  <span>• {formatHeight(player.heightFeet, player.heightInches)}</span>
                )}
                {player.weight && <span>• {player.weight} lbs</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center lg:justify-start gap-6 lg:gap-8 text-white/80">
                {player.school && (
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-eha-red" />
                    <span className="font-bold text-sm uppercase tracking-wider">{player.school}</span>
                  </span>
                )}
                {(player.city || player.state) && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-eha-red" />
                    <span className="font-bold text-sm uppercase tracking-wider">{[player.city, player.state].filter(Boolean).join(', ')}</span>
                  </span>
                )}
                {currentTeam && (
                  <span className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-eha-red" />
                    <span className="font-bold text-sm uppercase tracking-wider">{currentTeam.team.name}</span>
                  </span>
                )}
              </div>

              {/* Current social links preview */}
              <div className="mt-4 flex items-center justify-center lg:justify-start gap-3">
                {player.twitterHandle && (
                  <a
                    href={`https://twitter.com/${player.twitterHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-sm text-gray-400 hover:text-white hover:bg-[#1DA1F2]/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                )}
                {player.instagramHandle && (
                  <a
                    href={`https://instagram.com/${player.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-sm text-gray-400 hover:text-white hover:bg-[#E4405F]/20 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                  </a>
                )}
                {player.hudlUrl && (
                  <a
                    href={player.hudlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-sm text-gray-400 hover:text-white hover:bg-eha-red/20 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Sections */}
      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-sm p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-sm p-4">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* About Me */}
            <Card className="lg:col-span-2 rounded-sm p-0">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-2xl text-white uppercase tracking-tight font-bold">About Me</h2>
              </div>
              <div className="p-4">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio about the player..."
                  rows={4}
                  className="w-full bg-[#0a1628] border border-white/5 rounded-sm px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-eha-red/50 focus:border-eha-red/50 resize-none"
                />
              </div>
            </Card>

            {/* Socials & Contact */}
            <Card className="rounded-sm p-0">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-2xl text-white uppercase tracking-tight font-bold">Socials & Contact</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Email
                  </label>
                  <Input
                    type="email"
                    placeholder="player@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                    Instagram
                  </label>
                  <Input
                    type="text"
                    placeholder="username (without @)"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                    Twitter / X
                  </label>
                  <Input
                    type="text"
                    placeholder="username (without @)"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Highlights & Media Links */}
            <Card className="rounded-sm p-0">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-2xl text-white uppercase tracking-tight font-bold">Highlights & Media</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 3.993L9 16z" />
                    </svg>
                    Hudl Profile
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.hudl.com/profile/..."
                    value={hudlUrl}
                    onChange={(e) => setHudlUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    YouTube
                  </label>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <LinkIcon className="w-4 h-4" />
                    Highlight Link
                  </label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={highlightUrl}
                    onChange={(e) => setHighlightUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Link to any additional highlight reel or recruiting page
                  </p>
                </div>
              </div>
            </Card>

            {/* Academic Information */}
            <Card className="lg:col-span-2 rounded-sm p-0">
              <div className="p-4 border-b border-white/5">
                <h2 className="text-2xl text-white uppercase tracking-tight font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-eha-red" />
                  Academic Information
                </h2>
              </div>
              <div className="p-4 grid md:grid-cols-2 gap-6">
                {/* GPA Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    GPA (Grade Point Average)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    placeholder="3.5"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter GPA on a 4.0 scale
                  </p>
                </div>

                {/* Transcript Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transcript (PDF)
                  </label>
                  {transcriptUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-[#152e50]/50 border border-white/5 rounded-sm">
                      <FileText className="w-8 h-8 text-eha-red flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Transcript Uploaded</p>
                        <a
                          href={transcriptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-eha-red hover:underline"
                        >
                          View PDF
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveTranscript}
                        className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => transcriptInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-sm cursor-pointer transition-colors border-white/10 hover:border-eha-red/50 ${isUploadingTranscript ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-center p-6">
                        {isUploadingTranscript ? (
                          <>
                            <Loader2 className="w-8 h-8 text-eha-red animate-spin mb-2" />
                            <p className="text-sm text-gray-400">Uploading...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-500 mb-2" />
                            <p className="text-sm text-gray-400 text-center">
                              Click to upload transcript PDF
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Max 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <input
                    ref={transcriptInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleTranscriptUpload}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex gap-4 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex-1 max-w-xs"
            >
              Save Changes
            </Button>
          </div>
        </form>

        {/* Media Gallery — outside the form */}
        <Card className="mt-6 rounded-sm p-0">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-2xl text-white uppercase tracking-tight font-bold">Photo Gallery</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => mediaInputRef.current?.click()}
              disabled={isUploadingMedia}
              className="flex items-center gap-1"
            >
              {isUploadingMedia ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Upload Photo
            </Button>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleMediaUpload}
            />
          </div>
          <div className="p-4">
            {photos.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No photos yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Upload action shots, game photos, and more
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((item) => (
                  <div key={item.id} className="relative group rounded-sm overflow-hidden bg-white/5 aspect-square border border-white/5">
                    <Image
                      src={item.url}
                      alt={item.title || 'Player photo'}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(item.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#0a1628] border border-white/5 rounded-sm w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Frame Your Photo</h3>
              <p className="text-sm text-gray-400 mt-1">Drag to reposition, scroll or use controls to zoom</p>
            </div>

            <div className="relative w-full" style={{ height: '400px' }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Controls */}
            <div className="p-4 space-y-3 border-t border-white/5">
              {/* Zoom */}
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>

              {/* Rotate */}
              <div className="flex items-center gap-3">
                <RotateCw className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <span className="text-xs text-gray-400 w-8 text-right">{rotation}°</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/5 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCropCancel}
                disabled={isUploadingPhoto}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCropConfirm}
                isLoading={isUploadingPhoto}
                className="flex-1"
              >
                Save Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
