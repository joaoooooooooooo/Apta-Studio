'use client';

import { useState } from 'react';
import AssetsPanel from './AssetsPanel';
import CanvasPanel from './CanvasPanel';
import MediaDialog from './MediaDialog';
import MediaCropEditor from './MediaCropEditor';
import { useSceneStore } from '@/store/useSceneStore';

export default function MediaSidebar({ showCanvas = false }: { showCanvas?: boolean }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [cropAssetId, setCropAssetId] = useState<string | null>(null);
  const assets = useSceneStore(s => s.assets);
  const cropAsset = assets.find(asset => asset.id === cropAssetId && asset.url);
  return <div className={`media-sidebar ${cropAsset ? 'is-editing' : ''}`}>
    {cropAsset ? <MediaCropEditor key={cropAsset.id} asset={cropAsset} onClose={() => setCropAssetId(null)} /> : <>
      {showCanvas && <><CanvasPanel /><div className="hairline" /></>}
      <AssetsPanel onEditAsset={setSelectedIndex} onAdjustAsset={index => setCropAssetId(assets[index]?.id ?? null)} />
    </>}
    {selectedIndex !== null && <MediaDialog index={selectedIndex} onClose={() => setSelectedIndex(null)} />}
  </div>;
}
