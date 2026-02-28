import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import OpenAI from 'openai'

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  })
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { prompt, eventName, eventType, divisions } = await request.json()

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Please provide a brief description' }, { status: 400 })
    }

    const openai = getOpenAI()

    const systemPrompt = `You are a professional copywriter for Elite Hoops Association (EHA), a youth basketball organization. Write event descriptions that are:
- STRICTLY 2-3 sentences only. No more. Keep it concise and punchy.
- Professional yet energetic
- Written in third person (e.g., "This tournament features..." not "We are hosting...")
- Do NOT include placeholder text like [date], [location], etc. — only write what you know from the input
- Do NOT include a title, heading, or multiple paragraphs — just 2-3 sentences`

    const userPrompt = `Write a professional event description for an EHA basketball event.

Event name: ${eventName || 'Untitled Event'}
Event type: ${eventType || 'Tournament'}
${divisions?.length ? `Divisions: ${divisions.join(', ')}` : ''}

The admin's brief description: "${prompt}"

Write the description now.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    const description = completion.choices[0]?.message?.content?.trim()

    if (!description) {
      return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 })
    }

    return NextResponse.json({ description })
  } catch (err: any) {
    console.error('Error generating description:', err)

    if (err?.status === 429 || err?.code === 'insufficient_quota') {
      return NextResponse.json({ error: 'AI quota exceeded. Please try again later or write the description manually.' }, { status: 429 })
    }

    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 })
  }
}
