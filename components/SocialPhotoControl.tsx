'use client';
import { useState } from 'react';
import { idbPut } from '@/lib/assetDb';
import { SOCIAL_ASSET_PREFIX } from '@/lib/socialAssets';
import { useSceneStore } from '@/store/useSceneStore';
import type { ControlDef } from '@/lib/types';

export default function SocialPhotoControl({ def }: { def: ControlDef }) {
  const value = useSceneStore((s) => s.values[def.key]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Choose a PNG, JPG, or WebP image.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('Choose an image smaller than 20 MB.'); return; }
    setBusy(true); setError('');
    const trackId = useSceneStore.getState().activeTrackId;
    const templateId = useSceneStore.getState().activeTemplateId;
    try {
      const decoded = await createImageBitmap(file); decoded.close();
      const id = SOCIAL_ASSET_PREFIX + crypto.randomUUID();
      await idbPut(id, file);
      const current = useSceneStore.getState();
      if (current.activeTrackId === trackId && current.activeTemplateId === templateId) current.setValue(def.key, id);
    } catch { setError('Could not save the photo. Please try another image.'); }
    finally { setBusy(false); }
  };
  return <div className="ctl-section">
    <div className="ctl-row">
      <div className="ctl-input"><label className="upload">
        <input id={'social-' + def.key} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        <span>{busy ? 'Saving photo...' : `Upload ${def.label.toLowerCase()}`}</span>
      </label></div>
    </div>
    {value !== def.default && <button className="btn full" disabled={busy} onClick={() => useSceneStore.getState().setValue(def.key, def.default)}>Reset photo</button>}
    {error && <div className="ctl-hint" role="alert">{error}</div>}
  </div>;
}
