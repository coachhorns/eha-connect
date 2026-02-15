import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

function escapeCSV(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

const COLUMNS = [
  'FIRST_NAME',
  'LAST_NAME',
  'SCHOOL',
  'DIVISION',
  'EMAIL',
  'PAYMENT_STATUS',
  'AMOUNT_PAID',
  'WANTS_PHYSICAL_COPY',
  'REGISTERED_AT',
]

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: eventId } = await params

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { slug: true, name: true },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const registrations = await prisma.eventCollegeRegistration.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    })

    const rows: string[] = []

    for (const reg of registrations) {
      const rowData: Record<string, string> = {
        'FIRST_NAME': reg.firstName,
        'LAST_NAME': reg.lastName,
        'SCHOOL': reg.school,
        'DIVISION': reg.division,
        'EMAIL': reg.email,
        'PAYMENT_STATUS': reg.paymentStatus,
        'AMOUNT_PAID': `$${Number(reg.amountPaid).toFixed(2)}`,
        'WANTS_PHYSICAL_COPY': reg.wantsPhysicalCopy ? 'Yes' : 'No',
        'REGISTERED_AT': reg.createdAt.toISOString().split('T')[0],
      }

      const cells = COLUMNS.map(col => escapeCSV(rowData[col] || ''))
      rows.push(cells.join(','))
    }

    const header = COLUMNS.join(',')
    const csv = [header, ...rows].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="colleges-attending-${event.slug}.csv"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error exporting colleges:', message, error)
    return NextResponse.json(
      { error: message || 'Failed to export colleges' },
      { status: 500 }
    )
  }
}
