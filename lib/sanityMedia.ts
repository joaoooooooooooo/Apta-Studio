const API_VERSION = 'v2025-02-19'

export const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || '6raxko8s'
export const SANITY_DATASET = process.env.SANITY_DATASET || 'production'
const token = process.env.SANITY_API_TOKEN

export function sanityUrl(path: string) {
  return `https://${SANITY_PROJECT_ID}.api.sanity.io/${API_VERSION}${path}`
}

export function sanityHeaders(extra: HeadersInit = {}) {
  return {
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...extra,
  }
}

export function requireSanityToken() {
  if (!token) throw new Error('SANITY_API_TOKEN is not configured')
  return token
}

export const ASSET_QUERY = `*[_type == "mediaAsset"] | order(_createdAt desc){
    _id, _type, title, description, altText, tags, usageNotes, assetId, externalUrl, externalMimeType,
    "caseStudy": caseStudy->{_id, title},
    "asset": *[_id == coalesce(^.image.asset._ref, ^.file.asset._ref, ^.assetId)][0]{originalFilename, url, mimeType, size, metadata},
    "collections": *[_type == "mediaCollection" && references(^._id)]{_id, title, kind}
  }`

export const COLLECTION_QUERY = `*[_type == "mediaCollection"] | order(title asc){
  _id, title, kind, description, parent->{_id, title}, "assetIds": assets[]._ref,
  "caseStudyMarketingIds": caseStudyMarketing[]._ref,
  "marketingPostIds": marketingPosts[]._ref,
  "marketingVideoIds": marketingVideos[]._ref
}`

export async function sanityQuery(query: string, params: Record<string, unknown> = {}) {
  const response = await fetch(sanityUrl(`/data/query/${SANITY_DATASET}`), {
    method: 'POST',
    headers: sanityHeaders({'Content-Type': 'application/json'}),
    body: JSON.stringify({query, params}),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Sanity query failed (${response.status})`)
  return (await response.json() as {result: unknown}).result
}

export async function sanityMutation(mutations: unknown[]) {
  requireSanityToken()
  const response = await fetch(sanityUrl(`/data/mutate/${SANITY_DATASET}`), {
    method: 'POST',
    headers: sanityHeaders({'Content-Type': 'application/json'}),
    body: JSON.stringify({mutations}),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Sanity mutation failed (${response.status}): ${await response.text()}`)
  return response.json()
}
