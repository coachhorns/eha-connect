import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        ownedPrograms: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        players: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
          },
        },
        _count: {
          select: {
            players: true,
            ownedPrograms: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

// PUT update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { role, password, name } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent demoting the last admin
    if (existingUser.role === 'ADMIN' && role && role !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last admin' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {}

    if (role) {
      // Validate role
      const validRoles = ['PLAYER', 'PARENT', 'SCOREKEEPER', 'PROGRAM_DIRECTOR', 'ADMIN']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = role
    }

    if (name !== undefined) {
      updateData.name = name
    }

    if (password && password.trim()) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 12)
      updateData.password = hashedPassword
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        ownedPrograms: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        players: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            slug: true,
          },
        },
        _count: {
          select: {
            players: true,
            ownedPrograms: true,
          },
        },
      },
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE user (soft approach - could be extended)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Prevent deleting yourself
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Prevent deleting the last admin
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        ownedPrograms: {
          include: {
            teams: true,
          },
        },
      },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin' },
          { status: 400 }
        )
      }
    }

    // If user is a Program Director, handle their programs and teams
    if (user.ownedPrograms.length > 0) {
      // Get all team IDs from all programs owned by this user
      const teamIds = user.ownedPrograms.flatMap(program =>
        program.teams.map(team => team.id)
      )

      // Soft-delete all teams (set isActive: false)
      if (teamIds.length > 0) {
        await prisma.team.updateMany({
          where: { id: { in: teamIds } },
          data: { isActive: false },
        })
      }

      // Soft-delete all programs (set isActive: false)
      const programIds = user.ownedPrograms.map(program => program.id)
      await prisma.program.updateMany({
        where: { id: { in: programIds } },
        data: { isActive: false, ownerId: null },
      })
    }

    // Delete the user
    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
