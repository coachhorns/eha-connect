import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/get-session'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getSessionUser(request)
        if (!user?.id) {
          throw new Error('Unauthorized')
        }
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/quicktime',
            'application/pdf',
          ],
          maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
        }
      },
      onUploadCompleted: async () => {
        // No-op — media record creation is handled by the mobile client
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Upload token failed' },
      { status: 400 }
    )
  }
}
