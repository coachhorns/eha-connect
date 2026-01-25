import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, division, coachName, ageGroup, programId } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    if (!programId) {
      return NextResponse.json({ error: 'Program ID is required' }, { status: 400 })
    }

    // Verify the program belongs to this director
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        ownerId: session.user.id,
      },
    })

    if (!program) {
      return NextResponse.json({ error: 'Program not found or unauthorized' }, { status: 403 })
    }

    // Generate a unique slug
    let baseSlug = generateSlug(name.trim())
    let slug = baseSlug
    let counter = 1

    while (await prisma.team.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        slug,
        division: division?.trim() || null,
        ageGroup: ageGroup?.trim() || null,
        coachName: coachName?.trim() || null,
        gender: 'Boys', // Default
        programId: program.id,
        city: program.city,
        state: program.state,
      },
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    )
  }
}
