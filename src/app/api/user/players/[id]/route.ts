import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import prisma from '@/lib/prisma'

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

    const player = await prisma.player.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { guardians: { some: { userId: user.id } } },
        ],
      },
      include: {
        media: {
          orderBy: { uploadedAt: 'desc' },
        },
        teamRosters: {
          include: { team: true },
          orderBy: { joinedAt: 'desc' },
        },
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    return NextResponse.json({ player })
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.player.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          { guardians: { some: { userId: user.id } } },
        ],
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Player not found' }, { status: 403 })
    }

    const body = await request.json()

    // Defense in depth: non-admin users cannot change firstName or lastName
    if (user.role !== 'ADMIN') {
      delete body.firstName
      delete body.lastName
    }

    const {
      firstName,
      lastName,
      heightFeet,
      heightInches,
      weight,
      school,
      graduationYear,
      primaryPosition,
      secondaryPosition,
      jerseyNumber,
      profilePhoto,
      bio,
      email,
      twitterHandle,
      instagramHandle,
      hudlUrl,
      youtubeUrl,
      highlightUrl,
      maxPrepsUrl,
      gpa,
      transcriptUrl,
    } = body

    if (firstName !== undefined && !firstName?.trim()) {
      return NextResponse.json(
        { error: 'First name cannot be empty' },
        { status: 400 }
      )
    }

    if (lastName !== undefined && !lastName?.trim()) {
      return NextResponse.json(
        { error: 'Last name cannot be empty' },
        { status: 400 }
      )
    }

    const player = await prisma.player.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName: firstName.trim() }),
        ...(lastName !== undefined && { lastName: lastName.trim() }),
        ...(heightFeet !== undefined && { heightFeet: heightFeet ? parseInt(String(heightFeet), 10) : null }),
        ...(heightInches !== undefined && { heightInches: heightInches ? parseInt(String(heightInches), 10) : null }),
        ...(school !== undefined && { school: school?.trim() || null }),
        ...(graduationYear !== undefined && { graduationYear: graduationYear ? parseInt(String(graduationYear), 10) : null }),
        ...(primaryPosition !== undefined && { primaryPosition: primaryPosition || null }),
        ...(secondaryPosition !== undefined && { secondaryPosition: secondaryPosition || null }),
        ...(jerseyNumber !== undefined && { jerseyNumber: jerseyNumber?.trim() || null }),
        ...(weight !== undefined && { weight: weight ? parseInt(String(weight), 10) : null }),
        ...(profilePhoto !== undefined && { profilePhoto: profilePhoto?.trim() || null }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(twitterHandle !== undefined && { twitterHandle: twitterHandle?.trim() || null }),
        ...(instagramHandle !== undefined && { instagramHandle: instagramHandle?.trim() || null }),
        ...(hudlUrl !== undefined && { hudlUrl: hudlUrl?.trim() || null }),
        ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl?.trim() || null }),
        ...(highlightUrl !== undefined && { highlightUrl: highlightUrl?.trim() || null }),
        ...(maxPrepsUrl !== undefined && { maxPrepsUrl: maxPrepsUrl?.trim() || null }),
        ...(gpa !== undefined && { gpa: gpa ? parseFloat(String(gpa)) : null }),
        ...(transcriptUrl !== undefined && { transcriptUrl: transcriptUrl?.trim() || null }),
      },
    })

    return NextResponse.json({ player })
  } catch (error) {
    console.error('Error updating player:', error)
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
  }
}
