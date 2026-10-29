import {NextRequest, NextResponse} from 'next/server'
import {COLLECTION_QUERY, sanityMutation, sanityQuery} from '@/lib/sanityMedia'

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id: _id} = await params
    const body = await request.json() as Record<string, unknown>
    const allowed = ['title', 'description', 'altText', 'usageNotes', 'tags']
    const set = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
    const mutations: unknown[] = []
    if (Object.keys(set).length) mutations.push({patch: {_id, set}})
    if (body.isMarketing !== undefined || Array.isArray(body.marketingCaseStudyIds)) {
      const collections = await sanityQuery(COLLECTION_QUERY) as {
        _id: string; kind: string; caseStudyMarketingIds?: string[];
        marketingPostIds?: string[]; marketingVideoIds?: string[]
      }[]
      const desiredCaseIds = new Set(Array.isArray(body.marketingCaseStudyIds)
        ? body.marketingCaseStudyIds.map(String) : [])
      const marketingField = body.marketingMediaType === 'video' ? 'marketingVideos' : 'marketingPosts'
      const marketingCollections = collections.filter((collection) => collection.kind === 'marketing')
      if (body.isMarketing === true && !marketingCollections.length) throw new Error('Marketing collection is missing')
      for (const collection of collections) {
        const fields = collection.kind === 'marketing'
          ? [{field: 'marketingPosts', ids: collection.marketingPostIds || []}, {field: 'marketingVideos', ids: collection.marketingVideoIds || []}]
          : collection.kind === 'caseStudy'
            ? [{field: 'caseStudyMarketing', ids: collection.caseStudyMarketingIds || []}]
            : []
        for (const {field, ids} of fields) {
          const shouldHave = collection.kind === 'marketing'
            ? body.isMarketing === true && field === marketingField
            : desiredCaseIds.has(collection._id)
          const has = ids.includes(_id)
          if (shouldHave && !has) mutations.push({patch: {_id: collection._id,
            setIfMissing: {[field]: []}, insert: {after: `${field}[-1]`,
              items: [{_type: 'reference', _ref: _id, _key: crypto.randomUUID()}]}}})
          if (!shouldHave && has) mutations.push({patch: {_id: collection._id,
            unset: [`${field}[_ref == "${_id}"]`]}})
        }
      }
    }
    return NextResponse.json(await sanityMutation(mutations))
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Unable to update asset'}, {status: 500})
  }
}
