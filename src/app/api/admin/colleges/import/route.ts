import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()

    const { data, errors } = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parsing error: ${errors[0].message}` },
        { status: 400 }
      )
    }

    const rows = data as any[]

    if (rows.length > 0) {
      console.log('CSV headers (first row keys):', Object.keys(rows[0]))
      console.log('First row data:', rows[0])
    }

    // ── Phase 1: Parse & Group unique colleges ──
    const collegeMap = new Map<string, {
      name: string
      slug: string
      division: string
      conference: string | null
      city: string | null
      state: string | null
      region: string | null
    }>()

    let skipped = 0

    for (const row of rows) {
      const schoolName = row['School']?.trim()
      const division = row['Division']?.trim()
      const state = row['State']?.trim() || ''

      if (!schoolName || !division) {
        skipped++
        continue
      }

      const key = `${schoolName}||${state}`
      if (!collegeMap.has(key)) {
        collegeMap.set(key, {
          name: schoolName,
          slug: slugify(`${schoolName}${state ? '-' + state : ''}`),
          division,
          conference: row['Conference']?.trim() || null,
          city: row['City']?.trim() || null,
          state: state || null,
          region: row['Region']?.trim() || null,
        })
      }
    }

    // ── Phase 2: Upsert colleges per row (cached by key) ──
    const collegeIdMap = new Map<string, string>() // key -> college ID
    let collegesCreated = 0
    let collegesUpdated = 0

    for (const row of rows) {
      const schoolName = row['School']?.trim()
      const division = row['Division']?.trim()
      const state = row['State']?.trim() || ''

      if (!schoolName || !division) continue

      const key = `${schoolName}||${state}`
      if (collegeIdMap.has(key)) continue

      const col = collegeMap.get(key)!
      const college = await prisma.college.upsert({
        where: {
          name_state: {
            name: col.name,
            state: col.state || '',
          },
        },
        update: {
          division: col.division,
          conference: col.conference,
          city: col.city,
          region: col.region,
        },
        create: {
          name: col.name,
          slug: col.slug,
          division: col.division,
          conference: col.conference,
          city: col.city,
          state: col.state,
          region: col.region,
        },
      })

      collegeIdMap.set(key, college.id)
      if (college.createdAt.getTime() === college.updatedAt.getTime()) {
        collegesCreated++
      } else {
        collegesUpdated++
      }
    }

    // ── Phase 3: Fetch existing coaches, then bulk create only new ones ──
    const existingCoaches = await prisma.collegeCoach.findMany({
      select: { collegeId: true, firstName: true, lastName: true },
    })
    const existingCoachKeys = new Set(
      existingCoaches.map(
        (c) => `${c.collegeId}|${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}`
      )
    )

    const newCoaches: {
      collegeId: string
      firstName: string
      lastName: string
      title: string | null
      email: string | null
    }[] = []

    for (const row of rows) {
      const schoolName = row['School']?.trim()
      const state = row['State']?.trim() || ''
      const firstName = row['First name']?.trim()
      const lastName = row['Last name']?.trim()

      if (!schoolName || !firstName || !lastName) continue

      const key = `${schoolName}||${state}`
      const collegeId = collegeIdMap.get(key)
      if (!collegeId) continue

      const coachKey = `${collegeId}|${firstName.toLowerCase()}|${lastName.toLowerCase()}`
      if (existingCoachKeys.has(coachKey)) continue

      existingCoachKeys.add(coachKey) // prevent duplicates within same CSV
      newCoaches.push({
        collegeId,
        firstName,
        lastName,
        title: row['Position']?.trim() || null,
        email: row['Email address']?.trim() || null,
      })
    }

    let coachesCreated = 0
    const CHUNK_SIZE = 1000
    for (let i = 0; i < newCoaches.length; i += CHUNK_SIZE) {
      const chunk = newCoaches.slice(i, i + CHUNK_SIZE)
      const result = await prisma.collegeCoach.createMany({ data: chunk })
      coachesCreated += result.count
    }

    return NextResponse.json({
      success: true,
      collegesCreated,
      collegesUpdated,
      coachesCreated,
      skipped,
      totalRows: rows.length,
    })
  } catch (error: any) {
    console.error('Error importing colleges:', error)

    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate entry detected. A college with the same slug already exists.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: `Import failed: ${error.message || error}` },
      { status: 500 }
    )
  }
}
