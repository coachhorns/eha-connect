import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

async function verifyPlayerOwnership(playerId: string, userId: string) {
  return prisma.player.findFirst({
    where: {
      id: playerId,
      OR: [
        { userId },
        { guardians: { some: { userId } } },
      ],
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const player = await verifyPlayerOwnership(id, user.id)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    const media = await prisma.media.findMany({
      where: { playerId: id },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const player = await verifyPlayerOwnership(id, user.id)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 403 })
    }

    const body = await request.json()
    const { url, type, title, thumbnail } = body

    if (!url || !type) {
      return NextResponse.json(
        { error: 'URL and type are required' },
        { status: 400 }
      )
    }

    const media = await prisma.media.create({
      data: {
        playerId: id,
        url,
        type,
        title: title || null,
        thumbnail: thumbnail || null,
        isPublic: true,
      },
    })

    return NextResponse.json({ media }, { status: 201 })
  } catch (error) {
    console.error('Error creating media:', error)
    return NextResponse.json({ error: 'Failed to create media' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const player = await verifyPlayerOwnership(id, user.id)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 })
    }

    // Verify the media belongs to this player
    const media = await prisma.media.findFirst({
      where: { id: mediaId, playerId: id },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    await prisma.media.delete({ where: { id: mediaId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting media:', error)
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 })
  }
}
