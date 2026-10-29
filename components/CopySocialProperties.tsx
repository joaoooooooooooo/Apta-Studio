'use client';
import { useState } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { getTemplate } from '@/templates';
import { trackWindow } from '@/lib/tracks';
import { motionProperties, socialProperties } from '@/lib/socialProperties';

export default function CopySocialProperties() {
  const [status, setStatus] = useState('');
  const [fallback, setFallback] = useState('');
  async function copy() {
    const s = useSceneStore.getState();
    const track = s.tracks.find(t => t.id === s.activeTrackId);
    const duration = s.tracks.length > 1 && track ? trackWindow(track, Math.round(s.duration * s.fps)).length / s.fps : s.duration;
    const template = getTemplate(s.activeTemplateId);
    const timing = {
      duration, fps: s.fps,
      width: s.aspect === 'custom' ? s.customW : s.width,
      height: s.aspect === 'custom' ? s.customH : s.height, easing: s.easing,
    };
    const properties = template.meta.kind === 'social'
      ? socialProperties(template, s.values, timing)
      : motionProperties(template, s.values, timing, s);
    const text = JSON.stringify(properties, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setFallback(''); setStatus('Properties copied');
    } catch {
      setFallback(text); setStatus('Select and copy the properties below.');
    }
  }
  return <div className="section-body social-copy-properties">
    <button type="button" className="btn" onClick={() => void copy()}>Copy properties</button>
    <span className="ctl-hint" role="status">{status}</span>
    {fallback && <textarea className="field social-textarea" aria-label="Properties JSON" rows={8} value={fallback} readOnly onFocus={e => e.currentTarget.select()} />}
  </div>;
}
