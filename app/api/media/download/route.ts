import JSZip from 'jszip'
import {Readable} from 'node:stream'
import {ASSET_QUERY, SANITY_DATASET, SANITY_PROJECT_ID, sanityQuery} from '@/lib/sanityMedia'

type DownloadAsset = {
  _id: string
  title?: string
  externalUrl?: string
  asset?: {url?: string; originalFilename?: string}
}

function fileName(asset: DownloadAsset, index: number) {
  const source = asset.asset?.originalFilename || asset.title || `asset-${index + 1}`
  return source.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim() || `asset-${index + 1}`
}

export async function GET() {
  try {
    const assets = await sanityQuery(ASSET_QUERY) as DownloadAsset[]
    if (!assets.length) return Response.json({error: 'No media to download'}, {status: 404})

    const zip = new JSZip()
    const names = new Set<string>()
    for (const [index, asset] of assets.entries()) {
      const source = asset.asset?.url || asset.externalUrl
      if (!source) throw new Error(`Missing file for ${asset.title || asset._id}`)
      const url = new URL(source)
      const sanityPath = `/` + (url.pathname.startsWith('/images/') ? 'images' : 'files') + `/${SANITY_PROJECT_ID}/${SANITY_DATASET}/`
      if (url.origin !== 'https://cdn.sanity.io' || !url.pathname.startsWith(sanityPath))
        throw new Error(`Unsupported file host for ${asset.title || asset._id}`)

      const original = fileName(asset, index)
      let name = original
      let suffix = 2
      while (names.has(name.toLowerCase())) {
        const dot = original.lastIndexOf('.')
        name = dot > 0 ? `${original.slice(0, dot)}-${suffix++}${original.slice(dot)}` : `${original}-${suffix++}`
      }
      names.add(name.toLowerCase())

      // JSZip pulls each stream only when it reaches that entry, so the archive
      // does not hold the whole library in memory.
      const content = Readable.from((async function* () {
        const response = await fetch(url, {cache: 'no-store'})
        if (!response.ok || !response.body) throw new Error(`Unable to fetch ${name}`)
        for await (const chunk of Readable.fromWeb(response.body as never)) yield chunk
      })())
      zip.file(name, content, {binary: true})
    }

    const stream = zip.generateNodeStream({streamFiles: true, compression: 'STORE'})
    return new Response(Readable.toWeb(stream as Readable) as ReadableStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="media-library.zip"',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    return Response.json({error: error instanceof Error ? error.message : 'Unable to build ZIP'}, {status: 500})
  }
}
