import {NextRequest, NextResponse} from 'next/server'
import {sanityMutation} from '@/lib/sanityMedia'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {title?: string; kind?: string; parent?: string}
    if (!body.title?.trim()) return NextResponse.json({error: 'Collection name is required'}, {status: 400})
    const result = await sanityMutation([{create: {_type: 'mediaCollection', title: body.title.trim(), kind: body.kind || 'marketing', ...(body.parent ? {parent: {_type: 'reference', _ref: body.parent}} : {})}}])
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to create collection'}, {status: 500})
  }
}
