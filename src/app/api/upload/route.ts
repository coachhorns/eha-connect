import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'players'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const videoTypes = ['video/mp4', 'video/quicktime']
    const docTypes = ['application/pdf']
    const allowedTypes = [...imageTypes, ...videoTypes, ...docTypes]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV, PDF' },
        { status: 400 }
      )
    }

    // Validate file size based on type
    const isVideo = videoTypes.includes(file.type)
    const isDoc = docTypes.includes(file.type)
    const maxSize = isVideo ? 50 * 1024 * 1024 : isDoc ? 10 * 1024 * 1024 : 5 * 1024 * 1024
    const maxLabel = isVideo ? '50MB' : isDoc ? '10MB' : '5MB'
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxLabel}` },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${folder}/${timestamp}-${randomStr}.${ext}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
    })

    return NextResponse.json({ url: blob.url }, { status: 201 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
