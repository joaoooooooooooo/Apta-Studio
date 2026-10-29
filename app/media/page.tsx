import type {Metadata} from 'next'
import IconRail from '@/components/IconRail'
import MediaLibraryPage from '@/components/MediaLibraryPage'
import '@/styles/media.css'

export const metadata: Metadata = {title: 'Media library', description: 'Browse and manage the Apta marketing media library.'}

export default function MediaPage() {
  return <div className="media-workspace"><IconRail /><MediaLibraryPage /></div>
}
