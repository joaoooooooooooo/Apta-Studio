'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { isVideoSource } from '@/lib/videoTexture';
import { useSceneStore } from '@/store/useSceneStore';
import { CloseIcon } from './EditorIcons';
import './MediaDialog.css';

function clipboardUrl(data: DataTransfer): string | null {
  const html = data.getData('text/html');
  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const src = doc.querySelector('img[src], video[src], source[src]')?.getAttribute('src');
    if (src && /^(https?:|data:image\/|data:video\/)/i.test(src)) return src;
  }
  const text = data.getData('text/uri-list') || data.getData('text/plain');
  return /^(https?:|data:image\/|data:video\/)/i.test(text.trim()) ? text.trim() : null;
}

export default function MediaDialog({ index, onClose }: { index: number; onClose: () => void }) {
  const asset = useSceneStore(s => s.assets[index]);
  const replace = useSceneStore(s => s.replaceAssetAt);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const video = !!asset && isVideoSource(asset.url, asset.kind);

  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => { node?.close(); previous?.focus({ preventScroll: true }); };
  }, []);

  const useFile = (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Choose an image or video file.');
      return;
    }
    replace(index, {
      name: file.name || (file.type.startsWith('video/') ? 'Pasted video' : 'Pasted image'),
      url: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image',
      blob: file,
    });
    setError('');
  };

  const paste = (event: ClipboardEvent<HTMLDialogElement>) => {
    const file = Array.from(event.clipboardData.items).find(item => item.kind === 'file' && /^(image|video)\//.test(item.type))?.getAsFile();
    if (file) { event.preventDefault(); useFile(file); return; }
    const url = clipboardUrl(event.clipboardData);
    if (!url) return;
    event.preventDefault();
    const kind = /^(data:video\/|.*\.(mp4|webm|mov|m4v)(?:[?#]|$))/i.test(url) ? 'video' : 'image';
    replace(index, { name: 'Pasted media', url, kind });
    setError('');
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find(f => /^(image|video)\//.test(f.type));
    if (file) useFile(file);
  };

  return createPortal(<dialog ref={dialog} className="media-dialog" onClose={onClose} onPaste={paste}>
    <div className="media-dialog-head">
      <strong>{video ? 'Video' : 'Image'}</strong>
      <button type="button" className="media-dialog-close" aria-label="Close media dialog" onClick={onClose}><CloseIcon size={14} /></button>
    </div>
      <div className="media-dialog-body">
        <div className="media-choose-area" onDragOver={e => e.preventDefault()} onDrop={drop}>
          {asset?.url && (video ? <video src={asset.url} muted playsInline preload="metadata" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={asset.url} alt="Current media" />)}
          <button type="button" onClick={() => fileInput.current?.click()}>{asset?.url ? 'Replace media…' : 'Choose media…'}</button>
        </div>
        <p className="media-paste-hint">Paste an image or video here, or drop a file.</p>
        {error && <p className="media-dialog-error" role="alert">{error}</p>}
      </div>
    <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={e => { const file = e.target.files?.[0]; if (file) useFile(file); e.target.value = ''; }} />
  </dialog>, document.body);
}
