'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { getTemplate } from '@/templates';
import { useSceneStore } from '@/store/useSceneStore';
import { pngDimensions, PNG_RESOLUTIONS, type PngResolution } from '@/lib/pngDimensions';
import { exportCarousel } from '@/lib/exportCarousel';
import { captureSlidePng, pngFilename } from '@/lib/captureSlidePng';
import { ControlRow } from './Controls';

export default function SocialExport({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const carousel = useSceneStore(s => s.carouselSlides.length > 1);
  return <div className={compact ? 'social-export social-export-compact' : 'social-export'}><button type="button" className="btn solid" onClick={() => setOpen(true)}>{carousel ? 'Export carousel PNGs' : 'Export PNG'}</button>{open && <PngExportDialog onClose={() => setOpen(false)} />}</div>;
}

function PngExportDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scene = useSceneStore(useShallow(s => ({ width: s.width, height: s.height, aspect: s.aspect, customW: s.customW, customH: s.customH })));
  const [resolution, setResolution] = useState<PngResolution>('1080p');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const size = pngDimensions(resolution, scene);
  const slideCount = useSceneStore(s => s.carouselSlides.length);
  const templateId = useSceneStore(s => s.activeTemplateId);
  const sceneFrame = useSceneStore(s => s.frame);
  const fps = useSceneStore(s => s.fps);
  const duration = useSceneStore(s => s.duration);
  const isMotion = getTemplate(templateId).meta.kind !== 'social';
  const [frame, setFrame] = useState(sceneFrame);
  const maxFrame = Math.max(0, Math.round(duration * fps) - 1);
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close(); }, []);
  const exportPng = async () => {
    setBusy(true); setError(''); setDone(false);
    if (slideCount > 1) {
      try { await exportCarousel(size); setDone(true); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not export the carousel. Please try again.'); }
      finally { setBusy(false); }
      return;
    }
    try {
      const blob = await captureSlidePng(size, isMotion ? frame : 0, templateId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pngFilename(templateId);
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setDone(true);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not export the post. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return createPortal(<dialog ref={dialog} className="modal png-export-modal" aria-labelledby="png-export-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="modal-head"><span id="png-export-title">{slideCount > 1 ? 'Export carousel' : 'Export'}</span><button type="button" className="icon-btn" aria-label="Close export" disabled={busy} onClick={onClose}>&times;</button></div>
    <div className="modal-body">
      <div className="ctl-row"><span className="ctl-label" id="png-resolution-label">Resolution</span><div className="ctl-input"><div className="pills pills-fit" role="group" aria-labelledby="png-resolution-label">
        {(Object.keys(PNG_RESOLUTIONS) as Array<keyof typeof PNG_RESOLUTIONS>).map(value => <button type="button" key={value} className={`pill ${resolution === value ? 'active' : ''}`} aria-pressed={resolution === value} disabled={busy} onClick={() => { setResolution(value); setDone(false); }}>{value}</button>)}
        {scene.aspect === 'custom' && <button type="button" className={`pill ${resolution === 'exact' ? 'active' : ''}`} aria-pressed={resolution === 'exact'} disabled={busy} onClick={() => { setResolution('exact'); setDone(false); }} title="Exact canvas dimensions">{scene.customW}&times;{scene.customH}</button>}
      </div></div></div>
      <div className="ctl-hint">Output {size.width}&times;{size.height} px{slideCount > 1 ? ' per slide' : ''}</div>
      {slideCount > 1 && <div className="ctl-hint">Motion slides use the frame selected on each slide's timeline.</div>}
      {isMotion && slideCount <= 1 && <ControlRow def={{ key: 'png-frame', label: 'Frame', type: 'slider', min: 0, max: Math.max(1, maxFrame), step: 1, default: 0 }} value={Math.min(frame, maxFrame)} onChange={value => setFrame(Number(value))} disabled={busy} />}
      {error && <div className="export-error" role="alert">{error}</div>}
      {done && <div className="ctl-hint" role="status">{slideCount > 1 ? 'Numbered PNGs downloaded as a ZIP.' : 'PNG downloaded.'}</div>}
      <button type="button" className="btn primary full" disabled={busy} onClick={exportPng}>{busy ? 'Exporting...' : 'Start export'}</button>
    </div>
  </dialog>, document.body);
}
