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
  Video,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Upload,
  X,
} from 'lucide-react'
import { Card, Button, Input, Select } from '@/components/ui'
import { formatHeight, formatPosition } from '@/lib/utils'
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/video'

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
  maxPrepsUrl: string | null
  gpa: number | null
  transcriptUrl: string | null
  media: MediaItem[]
  teamRosters: TeamRoster[]
}

const positionOptions = [
  { value: '', label: 'Select Position' },
  { value: 'PG', label: 'Point Guard (PG)' },
  { value: 'SG', label: 'Shooting Guard (SG)' },
  { value: 'SF', label: 'Small Forward (SF)' },
  { value: 'PF', label: 'Power Forward (PF)' },
  { value: 'C', label: 'Center (C)' },
]

const heightFeetOptions = [
  { value: '', label: 'Ft' },
  { value: '3', label: "3'" },
  { value: '4', label: "4'" },
  { value: '5', label: "5'" },
  { value: '6', label: "6'" },
  { value: '7', label: "7'" },
]

const heightInchesOptions = [
  { value: '', label: 'In' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: `${i}"`,
  })),
]

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
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

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
  const [maxPrepsUrl, setMaxPrepsUrl] = useState('')
  const [gpa, setGpa] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [primaryPosition, setPrimaryPosition] = useState('')
  const [secondaryPosition, setSecondaryPosition] = useState('')
  const [school, setSchool] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [weight, setWeight] = useState('')
  const [transcriptUrl, setTranscriptUrl] = useState('')
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [isAddingVideo, setIsAddingVideo] = useState(false)
  const [showAddVideo, setShowAddVideo] = useState(false)
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
          setMaxPrepsUrl(p.maxPrepsUrl || '')
          setGpa(p.gpa ? String(p.gpa) : '')
          setGraduationYear(p.graduationYear ? String(p.graduationYear) : '')
          setHeightFt(p.heightFeet ? String(p.heightFeet) : '')
          setHeightIn(p.heightInches != null ? String(p.heightInches) : '')
          setPrimaryPosition(p.primaryPosition || '')
          setSecondaryPosition(p.secondaryPosition || '')
          setSchool(p.school || '')
          setJerseyNumber(p.jerseyNumber || '')
          setWeight(p.weight ? String(p.weight) : '')
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

  const processTranscriptFile = async (file: File) => {
    if (file.type !== 'application/pdf' && file.type !== 'image/png') {
      setError('Please select a PDF or PNG file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB')
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

  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processTranscriptFile(file)
  }

  const handleTranscriptDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processTranscriptFile(file)
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

  const handleAddVideo = async () => {
    if (!videoUrl.trim()) return

    setIsAddingVideo(true)
    setError('')

    try {
      let thumbnail: string | null = null
      const ytId = extractYouTubeId(videoUrl)
      if (ytId) {
        thumbnail = getYouTubeThumbnail(ytId)
      }

      const mediaRes = await fetch(`/api/user/players/${resolvedParams.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoUrl.trim(),
          type: 'VIDEO',
          title: videoTitle.trim() || null,
          thumbnail,
        }),
      })

      if (mediaRes.ok) {
        const data = await mediaRes.json()
        setPlayer(prev => prev ? { ...prev, media: [data.media, ...prev.media] } : null)
        setVideoUrl('')
        setVideoTitle('')
        setShowAddVideo(false)
      } else {
        setError('Failed to add video')
      }
    } catch (err) {
      console.error('Error adding video:', err)
      setError('Failed to add video')
    } finally {
      setIsAddingVideo(false)
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
          maxPrepsUrl: maxPrepsUrl.trim() || null,
          gpa: gpa ? parseFloat(gpa) : null,
          graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
          heightFeet: heightFt ? parseInt(heightFt, 10) : null,
          heightInches: heightIn !== '' ? parseInt(heightIn, 10) : null,
          primaryPosition: primaryPosition || null,
          secondaryPosition: secondaryPosition || null,
          school: school.trim() || null,
          jerseyNumber: jerseyNumber.trim() || null,
          weight: weight ? parseInt(weight, 10) : null,
        }),
      })

      if (res.ok) {
        setShowSaveSuccess(true)
        setTimeout(() => setShowSaveSuccess(false), 1500)
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
  const videos = player.media.filter(m => m.type === 'VIDEO')

  return (
    <div className="min-h-screen">
      {/* Back link */}
      <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16 pt-32 pb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      {/* Hero Section — matches public profile */}
      <div className="relative border-b border-border-subtle py-12 lg:py-16">
        <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-16">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Player Photo — clickable for upload */}
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative w-48 h-60 lg:w-56 lg:h-64 rounded-sm overflow-hidden bg-surface-raised border-4 border-border-default mx-auto lg:mx-0 group cursor-pointer shadow-2xl"
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
                {graduationYear && (
                  <span className="px-3 py-1 bg-eha-red text-white text-[10px] font-extrabold tracking-widest uppercase rounded-sm shadow-lg shadow-eha-red/20">
                    Class of {graduationYear}
                  </span>
                )}
                {player.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-extrabold uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30">
                    <Shield className="w-3 h-3" />
                    Verified
                  </span>
                )}
                {primaryPosition && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-surface-overlay text-white/60 border border-border-default">
                    {formatPosition(primaryPosition)}
                  </span>
                )}
                {jerseyNumber && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-surface-overlay text-text-secondary border border-border-default">
                    #{jerseyNumber}
                  </span>
                )}
              </div>

              <h1 className="text-5xl lg:text-7xl tracking-tighter font-bold text-text-primary uppercase">
                {player.firstName} <span className="text-white/90">{player.lastName}</span>
              </h1>

              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-white/60 font-bold text-sm uppercase tracking-widest">
                {primaryPosition && (
                  <span>{formatPosition(primaryPosition)}</span>
                )}
                {heightFt && (
                  <span>• {formatHeight(parseInt(heightFt, 10), heightIn !== '' ? parseInt(heightIn, 10) : null)}</span>
                )}
                {weight && <span>• {weight} lbs</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center lg:justify-start gap-6 lg:gap-8 text-white/80">
                {school && (
                  <span className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-eha-red" />
                    <span className="font-bold text-sm uppercase tracking-wider">{school}</span>
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
                    className="p-2 bg-surface-overlay rounded-sm text-text-muted hover:text-text-primary hover:bg-[#1DA1F2]/20 transition-colors"
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
                    className="p-2 bg-surface-overlay rounded-sm text-text-muted hover:text-text-primary hover:bg-[#E4405F]/20 transition-colors"
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
                    className="p-2 bg-surface-overlay rounded-sm text-text-muted hover:text-text-primary hover:bg-eha-red/20 transition-colors"
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
        {success && success !== '' && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-sm p-4">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Player Information */}
            <Card className="lg:col-span-2 rounded-sm p-0">
              <div className="p-4 border-b border-border-subtle">
                <h2 className="text-2xl text-text-primary uppercase tracking-tight font-bold">Player Information</h2>
                <p className="text-sm text-text-muted mt-1">
                  Name changes require contacting an administrator.
                </p>
              </div>
              <div className="p-4 space-y-6">
                {/* Name — read-only */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">First Name</label>
                    <div className="w-full px-4 py-2.5 bg-surface-raised/50 border border-border-subtle rounded-lg text-text-muted cursor-not-allowed">
                      {player.firstName}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Last Name</label>
                    <div className="w-full px-4 py-2.5 bg-surface-raised/50 border border-border-subtle rounded-lg text-text-muted cursor-not-allowed">
                      {player.lastName}
                    </div>
                  </div>
                </div>

                {/* Row: Grad Year, School, Jersey, Weight */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Graduation Year</label>
                    <Input
                      type="number"
                      placeholder="e.g. 2027"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      min={2020}
                      max={2040}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">School</label>
                    <Input
                      type="text"
                      placeholder="School name"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Jersey Number</label>
                    <Input
                      type="text"
                      placeholder="#"
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Weight (lbs)</label>
                    <Input
                      type="number"
                      placeholder="Weight"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      min={50}
                      max={400}
                    />
                  </div>
                </div>

                {/* Row: Height, Positions */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Height (ft)</label>
                    <Select
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      options={heightFeetOptions}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Height (in)</label>
                    <Select
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      options={heightInchesOptions}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Primary Position</label>
                    <Select
                      value={primaryPosition}
                      onChange={(e) => setPrimaryPosition(e.target.value)}
                      options={positionOptions}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Secondary Position</label>
                    <Select
                      value={secondaryPosition}
                      onChange={(e) => setSecondaryPosition(e.target.value)}
                      options={positionOptions}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* About Me */}
            <Card className="lg:col-span-2 rounded-sm p-0">
              <div className="p-4 border-b border-border-subtle">
                <h2 className="text-2xl text-text-primary uppercase tracking-tight font-bold">About Me</h2>
              </div>
              <div className="p-4">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio about the player..."
                  rows={4}
                  className="w-full bg-page-bg-alt border border-border-subtle rounded-sm px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-eha-red/50 focus:border-eha-red/50 resize-none"
                />
              </div>
            </Card>

            {/* Socials & Contact */}
            <Card className="rounded-sm p-0">
              <div className="p-4 border-b border-border-subtle">
                <h2 className="text-2xl text-text-primary uppercase tracking-tight font-bold">Socials & Contact</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
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
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
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
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
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

            {/* Recruiting Links */}
            <Card className="rounded-sm p-0">
              <div className="p-4 border-b border-border-subtle">
                <h2 className="text-2xl text-text-primary uppercase tracking-tight font-bold">Recruiting Links</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                    <Image src="/images/logos/hudl.png" alt="Hudl" width={20} height={20} className="w-5 h-5 object-contain" />
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
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                    <Image src="/images/logos/maxpreps.png" alt="MaxPreps" width={20} height={20} className="w-5 h-5 object-contain" />
                    MaxPreps Profile
                  </label>
                  <Input
                    type="url"
                    placeholder="https://www.maxpreps.com/athlete/..."
                    value={maxPrepsUrl}
                    onChange={(e) => setMaxPrepsUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
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
                  <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                    <LinkIcon className="w-4 h-4" />
                    Highlight Link
                  </label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={highlightUrl}
                    onChange={(e) => setHighlightUrl(e.target.value)}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Link to any additional highlight reel or recruiting page
                  </p>
                </div>
              </div>
            </Card>

            {/* Academic Information */}
            <Card className="lg:col-span-2 rounded-sm p-0">
              <div className="p-4 border-b border-border-subtle">
                <h2 className="text-2xl text-text-primary uppercase tracking-tight font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-eha-red" />
                  Academic Information
                </h2>
              </div>
              <div className="p-4 grid md:grid-cols-2 gap-6">
                {/* GPA Input */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
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
                  <p className="text-xs text-text-muted mt-1">
                    Enter GPA on a 4.0 scale
                  </p>
                </div>

                {/* Transcript Upload */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Transcript (PDF)
                  </label>
                  {transcriptUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-surface-raised/50 border border-border-subtle rounded-sm">
                      <FileText className="w-8 h-8 text-eha-red flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">Transcript Uploaded</p>
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
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleTranscriptDrop}
                      className={`relative border-2 border-dashed rounded-sm cursor-pointer transition-colors border-border-default hover:border-eha-red/50 ${isUploadingTranscript ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-center p-6">
                        {isUploadingTranscript ? (
                          <>
                            <Loader2 className="w-8 h-8 text-eha-red animate-spin mb-2" />
                            <p className="text-sm text-text-muted">Uploading...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-text-muted mb-2" />
                            <p className="text-sm text-text-muted text-center">
                              Click or drag to upload transcript
                            </p>
                            <p className="text-xs text-text-muted mt-1">PDF or PNG, max 10MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  <input
                    ref={transcriptInputRef}
                    type="file"
                    accept="application/pdf,image/png"
                    className="hidden"
                    onChange={handleTranscriptUpload}
                  />
                </div>
              </div>
            </Card>
          </div>

        </form>

        {/* Film Room */}
        <Card className="mt-6 rounded-sm p-0">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-2xl text-text-primary uppercase tracking-tight font-bold flex items-center gap-2">
              <Video className="w-5 h-5 text-eha-red" />
              Film Room
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddVideo(!showAddVideo)}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Video
            </Button>
          </div>
          <div className="p-4">
            {/* Add Video Form */}
            {showAddVideo && (
              <div className="mb-6 p-4 bg-page-bg-alt border border-border-subtle rounded-sm space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Video URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Paste a YouTube or Hudl video link
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Title (optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Season Highlights 2025"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddVideo(false)
                      setVideoUrl('')
                      setVideoTitle('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddVideo}
                    disabled={!videoUrl.trim() || isAddingVideo}
                    isLoading={isAddingVideo}
                  >
                    Save Video
                  </Button>
                </div>
              </div>
            )}

            {/* Video Grid */}
            {videos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No videos yet</p>
                <p className="text-sm text-text-muted mt-1">
                  Add YouTube or Hudl highlight videos
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((item) => {
                  const ytId = extractYouTubeId(item.url)
                  const thumbUrl = item.thumbnail || (ytId ? getYouTubeThumbnail(ytId) : null)

                  return (
                    <div key={item.id} className="relative group rounded-sm overflow-hidden bg-surface-glass aspect-video border border-border-subtle">
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={item.title || 'Video'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-page-bg-alt">
                          <Video className="w-10 h-10 text-text-muted" />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5" />
                        </div>
                      </div>
                      {/* Title */}
                      {item.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <p className="text-white text-xs font-bold truncate">{item.title}</p>
                        </div>
                      )}
                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteMedia(item.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Media Gallery — outside the form */}
        <Card className="mt-6 rounded-sm p-0">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-2xl text-text-primary uppercase tracking-tight font-bold">Photo Gallery</h2>
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
                <Camera className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-muted">No photos yet</p>
                <p className="text-sm text-text-muted mt-1">
                  Upload action shots, game photos, and more
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((item) => (
                  <div key={item.id} className="relative group rounded-sm overflow-hidden bg-surface-glass aspect-square border border-border-subtle">
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

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 z-50 bg-page-bg border-t border-border-default p-4 flex justify-end gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/dashboard')}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault()
            const form = document.querySelector('form')
            if (form) form.requestSubmit()
          }}
          isLoading={isSubmitting}
          className="min-w-[160px]"
        >
          Save Changes
        </Button>
      </div>

      {/* Save Success Overlay */}
      {showSaveSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="bg-page-bg/95 backdrop-blur-xl border border-green-500/30 rounded-sm p-8 flex flex-col items-center gap-3 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-text-primary font-bold text-lg uppercase tracking-wider">Saved Successfully</p>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-page-bg-alt border border-border-subtle rounded-sm w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-border-subtle">
              <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight">Frame Your Photo</h3>
              <p className="text-sm text-text-muted mt-1">Drag to reposition, scroll or use controls to zoom</p>
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
            <div className="p-4 space-y-3 border-t border-border-subtle">
              {/* Zoom */}
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-text-muted flex-shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <ZoomIn className="w-4 h-4 text-text-muted flex-shrink-0" />
              </div>

              {/* Rotate */}
              <div className="flex items-center gap-3">
                <RotateCw className="w-4 h-4 text-text-muted flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <span className="text-xs text-text-muted w-8 text-right">{rotation}°</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border-subtle flex gap-3">
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
