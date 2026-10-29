import {NextRequest, NextResponse} from 'next/server'
import {SANITY_DATASET, SANITY_PROJECT_ID} from '@/lib/sanityMedia'

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get('url')
  if (!source) return NextResponse.json({error: 'Image URL is required'}, {status: 400})

  let imageUrl: URL
  try {
    imageUrl = new URL(source)
  } catch {
    return NextResponse.json({error: 'Invalid image URL'}, {status: 400})
  }
  const imagePath = `/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/`
  if (imageUrl.origin !== 'https://cdn.sanity.io' || !imageUrl.pathname.startsWith(imagePath)) {
    return NextResponse.json({error: 'Image URL is outside this library'}, {status: 400})
  }

  imageUrl.search = '?fm=png'
  try {
    const response = await fetch(imageUrl, {cache: 'no-store'})
    if (!response.ok || !response.body) {
      return NextResponse.json({error: 'Unable to fetch image'}, {status: 502})
    }
    return new NextResponse(response.body, {
      headers: {'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=60'},
    })
  } catch {
    return NextResponse.json({error: 'Unable to fetch image'}, {status: 502})
  }
}
