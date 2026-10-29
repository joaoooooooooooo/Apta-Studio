import {NextRequest, NextResponse} from 'next/server'
import {sanityMutation} from '@/lib/sanityMedia'

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id: _id} = await params
    const body = await request.json() as {title?: string; parent?: string | null; assetId?: string; removeAssetId?: string}
    const set: Record<string, unknown> = {}
    if (body.title !== undefined) set.title = body.title.trim()
    if (body.parent !== undefined) set.parent = body.parent ? {_type: 'reference', _ref: body.parent} : null
    const mutations: unknown[] = []
    if (Object.keys(set).length) mutations.push({patch: {_id, set}})
    if (body.assetId) mutations.push({patch: {_id, insert: {after: 'assets[-1]', items: [{_type: 'reference', _ref: body.assetId}]}}})
    if (body.removeAssetId) mutations.push({patch: {_id, unset: [`assets[_ref == "${body.removeAssetId}"]` ]}})
    if (!mutations.length) return NextResponse.json({ok: true})
    return NextResponse.json(await sanityMutation(mutations))
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to update collection'}, {status: 500})
  }
}
