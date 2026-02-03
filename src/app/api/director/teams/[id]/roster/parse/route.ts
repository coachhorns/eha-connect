import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import Papa from 'papaparse'

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })
}

interface ParsedPlayer {
  firstName: string
  lastName: string
  jerseyNumber: string | null
  primaryPosition: string | null
  graduationYear: number | null
  heightFeet: number | null
  heightInches: number | null
  school: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'PROGRAM_DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params

    // Verify team ownership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        program: {
          select: { ownerId: true },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (!team.program || team.program.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const fileType = file.type

    let players: ParsedPlayer[] = []

    // Handle CSV files
    if (fileName.endsWith('.csv') || fileType === 'text/csv') {
      const text = await file.text()
      players = await parseCSV(text)
    }
    // Handle image files (PNG, JPG, JPEG)
    else if (
      fileType.startsWith('image/') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg')
    ) {
      players = await parseImageWithAI(file)
    }
    // Handle PDF files - not supported due to Node.js compatibility issues
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'PDF files are not supported. Please take a screenshot of the PDF and upload as PNG, or export to CSV.' },
        { status: 400 }
      )
    }
    // Handle Excel files
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Excel files are not supported. Please export to CSV.' },
        { status: 400 }
      )
    }
    else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV, PNG, or JPG.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ players })
  } catch (error: any) {
    console.error('Error parsing roster:', error)

    // Pass through specific error messages
    const errorMessage = error?.message?.includes('quota') || error?.message?.includes('API key')
      ? error.message
      : 'Failed to parse roster file'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

async function parseCSV(text: string): Promise<ParsedPlayer[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const players: ParsedPlayer[] = results.data.map((row: any) => {
          // Try to find columns by various possible names
          const firstName = row['firstName'] || row['First Name'] || row['first_name'] || row['First'] || ''
          const lastName = row['lastName'] || row['Last Name'] || row['last_name'] || row['Last'] || ''
          const jerseyNumber = row['jerseyNumber'] || row['Jersey'] || row['#'] || row['Number'] || row['jersey'] || null
          const position = row['primaryPosition'] || row['Position'] || row['Pos'] || row['position'] || null
          const gradYear = row['graduationYear'] || row['Grad Year'] || row['Class'] || row['Year'] || row['graduation_year'] || null
          const heightFeet = row['heightFeet'] || row['Height Feet'] || row['Feet'] || null
          const heightInches = row['heightInches'] || row['Height Inches'] || row['Inches'] || null
          const school = row['school'] || row['School'] || null

          return {
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            jerseyNumber: jerseyNumber ? String(jerseyNumber).trim() : null,
            primaryPosition: position ? String(position).trim().toUpperCase() : null,
            graduationYear: gradYear ? parseInt(String(gradYear)) || null : null,
            heightFeet: heightFeet ? parseInt(String(heightFeet)) || null : null,
            heightInches: heightInches ? parseInt(String(heightInches)) || null : null,
            school: school ? String(school).trim() : null,
          }
        }).filter(p => p.firstName && p.lastName)

        resolve(players)
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

async function parseImageWithAI(file: File): Promise<ParsedPlayer[]> {
  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OpenAI API key not configured. Please use CSV files instead.')
  }

  // Convert file to base64
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString('base64')
  const mimeType = file.type || 'image/jpeg'

  let response
  try {
    response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract player roster data from this image/document. Return ONLY a valid JSON array with no additional text or markdown formatting.

Each player object should have these fields:
- firstName (string, required)
- lastName (string, required)
- jerseyNumber (string or null)
- primaryPosition (string or null - MUST be one of these EXACT values only: "PG", "SG", "SF", "PF", "C". If position says "Guard" or "G", use "PG". If position says "Forward" or "F", use "SF". If position says "Center", use "C". If unclear, use null.)
- graduationYear (number or null - 4-digit year like 2026)
- heightFeet (number or null)
- heightInches (number or null)
- school (string or null)

CRITICAL FORMATTING RULES:
1. Capitalization: Convert ALL names and schools to proper Title Case (e.g., "John Smith", "Lincoln High"). Do NOT return all-caps or lowercase.
2. School Names: Correct obvious spelling/punctuation errors in school names (e.g., convert "st marys" to "St. Mary's", "hs" to "High School").
3. Unique Names: If a name appears to be unique or spelled creatively, PRESERVE the spelling but fix the capitalization. Do NOT autocorrect unique names to common dictionary words.

Example output format:
[{"firstName":"John","lastName":"Smith","jerseyNumber":"23","primaryPosition":"PG","graduationYear":2026,"heightFeet":6,"heightInches":2,"school":"Lincoln High"}]

If you cannot read certain values clearly, use null. Extract as many players as you can find.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    })
  } catch (error: any) {
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing or use CSV files instead.')
    }
    throw error
  }

  const content = response.choices[0]?.message?.content || '[]'

  try {
    // Try to extract JSON from the response
    let jsonStr = content.trim()

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7)
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3)
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3)
    }
    jsonStr = jsonStr.trim()

    const parsed = JSON.parse(jsonStr)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((p: any) => ({
      firstName: String(p.firstName || '').trim(),
      lastName: String(p.lastName || '').trim(),
      jerseyNumber: p.jerseyNumber ? String(p.jerseyNumber).trim() : null,
      primaryPosition: p.primaryPosition ? String(p.primaryPosition).trim().toUpperCase() : null,
      graduationYear: p.graduationYear ? parseInt(String(p.graduationYear)) || null : null,
      heightFeet: p.heightFeet ? parseInt(String(p.heightFeet)) || null : null,
      heightInches: p.heightInches ? parseInt(String(p.heightInches)) || null : null,
      school: p.school ? String(p.school).trim() : null,
    })).filter((p: ParsedPlayer) => p.firstName && p.lastName)
  } catch (e) {
    console.error('Failed to parse AI response:', content, e)
    return []
  }
}
