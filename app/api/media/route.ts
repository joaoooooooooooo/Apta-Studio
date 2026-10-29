import {NextRequest, NextResponse} from 'next/server'
import {ASSET_QUERY, COLLECTION_QUERY, sanityHeaders, sanityMutation, sanityQuery, sanityUrl, SANITY_DATASET} from '@/lib/sanityMedia'

export async function GET() {
  try {
    const [assets, collections] = await Promise.all([sanityQuery(ASSET_QUERY), sanityQuery(COLLECTION_QUERY)])
    return NextResponse.json({assets, collections})
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to load media'}, {status: 500})
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    const collectionIds = JSON.parse(String(form.get('collectionIds') || '[]')) as string[]
    const caseStudyId = String(form.get('caseStudyId') || '')
    const marketing = form.get('isMarketing') === 'true'
    if (!(file instanceof File)) return NextResponse.json({error: 'A file is required'}, {status: 400})
    const type = file.type.startsWith('image/') ? 'images' : 'files'
    const upload = await fetch(sanityUrl(`/assets/${type}/${SANITY_DATASET}?filename=${encodeURIComponent(file.name)}`), {
      method: 'POST', headers: sanityHeaders({'Content-Type': file.type || 'application/octet-stream'}), body: file, cache: 'no-store',
    })
    if (!upload.ok) return NextResponse.json({error: `Upload failed: ${await upload.text()}`}, {status: upload.status})
    const uploaded = await upload.json() as {document?: {_id?: string}}
    const assetId = uploaded.document?._id
    if (!assetId) throw new Error('Sanity did not return an asset document')
    const wrapper = await sanityMutation([{create: {_type: 'mediaAsset', assetId, assetType: type === 'images' ? 'image' : 'file', title: file.name,
      ...(caseStudyId && !marketing ? {caseStudy: {_type: 'reference', _ref: caseStudyId}} : {})}}]) as {results?: [{id?: string}]}
    const wrapperId = wrapper.results?.[0]?.id
    if (!wrapperId) throw new Error('Unable to find the uploaded item')
    const mutations: unknown[] = collectionIds.map((_id) => ({patch: {_id,
      setIfMissing: {assets: []}, insert: {after: 'assets[-1]', items: [{_type: 'reference', _ref: wrapperId, _key: crypto.randomUUID()}]}}}))
    if (marketing) {
      const marketingId = await sanityQuery('*[_type == "mediaCollection" && kind == "marketing"][0]._id') as string | null
      if (!marketingId) throw new Error('Marketing collection is missing')
      const field = file.type.startsWith('video/') ? 'marketingVideos' : 'marketingPosts'
      mutations.push({patch: {_id: marketingId, setIfMissing: {[field]: []},
        insert: {after: `${field}[-1]`, items: [{_type: 'reference', _ref: wrapperId, _key: crypto.randomUUID()}]}}})
      if (caseStudyId) mutations.push({patch: {_id: caseStudyId, setIfMissing: {caseStudyMarketing: []},
        insert: {after: 'caseStudyMarketing[-1]', items: [{_type: 'reference', _ref: wrapperId, _key: crypto.randomUUID()}]}}})
    }
    if (mutations.length) await sanityMutation(mutations)
    return NextResponse.json({assetId: wrapperId})
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to upload'}, {status: 500})
  }
}
