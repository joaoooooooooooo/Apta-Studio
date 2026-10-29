'use client';

import { useEffect, useState } from 'react';
import { useSceneStore, ASPECTS } from '@/store/useSceneStore';
import { getTemplate } from '@/templates';
import { ControlRow } from './Controls';
import GradientEditor from './GradientEditor';
import ColorPicker from './ColorPicker';
import { normalizeGradientSpec } from '@/lib/gradient';
import type { ControlDef } from '@/lib/types';

const FPS_OPTIONS = [15, 25, 30, 60] as const;
const BG_ALPHA: ControlDef = { key: 'background-alpha', label: 'Alpha', type: 'slider', min: 0, max: 100, step: 1, default: 100 };
const TEXT_CONTROLS: ControlDef[] = [
  { key: 'overlayText', label: 'Heading', type: 'text', multiline: true, default: '' },
  { key: 'overlayTextSize', label: 'Text size', type: 'slider', min: 24, max: 160, step: 1, unit: 'px', default: 72 },
  { key: 'overlayTextColor', label: 'Text color', type: 'color', default: '#191919' },
  { key: 'overlayTextAlign', label: 'Text align', type: 'pills', options: ['Left', 'Center', 'Right'], default: 'Center' },
  { key: 'overlayTextX', label: 'Position X', type: 'slider', min: 0, max: 100, step: 1, unit: '%', default: 50 },
  { key: 'overlayTextY', label: 'Position Y', type: 'slider', min: 0, max: 100, step: 1, unit: '%', default: 50 },
];
const BG_SOURCES: { id: 'color' | 'image' | 'card'; label: string }[] = [
  { id: 'color', label: 'Color' },
  { id: 'image', label: 'Image' },
  { id: 'card', label: 'From card' },
];

// Pixel input that commits on blur/Enter so half-typed values don't
// resize the canvas mid-keystroke.
// min/max default to canvas pixels; the card shape reuses this for a ratio,
// where 3 is a legitimate entry and a 16px floor would mark it invalid.
export function DimInput({ value, onCommit, min = 16, max = 8192 }: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n) && n > 0) onCommit(n);
    else setText(String(value));
  };
  return (
    <input
      className="field dim-field"
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

// `is3DMode` drops Safe area and the Background/Logo/Audio sections — 3D
// and Mockup mode have their own BackgroundFill panel and no overlay concept.
export default function CanvasPanel({ is3DMode = false }: { is3DMode?: boolean } = {}) {
  const aspect = useSceneStore((s) => s.aspect);
  const activeTemplateId = useSceneStore((s) => s.activeTemplateId);
  const values = useSceneStore((s) => s.values);
  const setValue = useSceneStore((s) => s.setValue);
  const isSocial = !is3DMode && getTemplate(activeTemplateId).meta.kind === 'social';
  const isSocialMotion = !is3DMode && getTemplate(activeTemplateId).meta.kind === 'social-motion';
  const setAspect = useSceneStore((s) => s.setAspect);
  const customW = useSceneStore((s) => s.customW);
  const customH = useSceneStore((s) => s.customH);
  const setCustomDims = useSceneStore((s) => s.setCustomDims);
  const fps = useSceneStore((s) => s.fps);
  const setFps = useSceneStore((s) => s.setFps);
  const safeArea = useSceneStore((s) => s.safeArea);
  const toggleSafeArea = useSceneStore((s) => s.toggleSafeArea);
  const background = useSceneStore((s) => s.background);
  const setBackground = useSceneStore((s) => s.setBackground);
  const logo = useSceneStore((s) => s.logo);
  const setLogo = useSceneStore((s) => s.setLogo);
  const logoX = logo.x ?? (logo.position.includes('r') ? 100 : 0);
  const logoY = logo.y ?? (logo.position.startsWith('b') ? 100 : 0);
  const setAudioUrl = useSceneStore((s) => s.setAudioUrl);
  const audioUrl = useSceneStore((s) => s.audioUrl);
  const isStickerCanvas = activeTemplateId.startsWith('stickers-')
    || activeTemplateId.startsWith('poster-')
    || activeTemplateId.startsWith('spinner-')
    || activeTemplateId.startsWith('hinge-')
    || activeTemplateId.startsWith('fan-');
  const backgroundGradient = normalizeGradientSpec(background.gradientSpec, background.color, background.color2);

  const rawAlpha = background.alpha ?? 100;
  const currentAlpha = (rawAlpha > 0 && rawAlpha <= 1) ? Math.round(rawAlpha * 100) : rawAlpha;

  return (
    <>
      <div className="section-head"><span className="eyebrow">Canvas</span></div>
      <div className="section-body">
        <div className="ctl-section">
          <div className="ctl-section-title">Dimensions</div>
          <div className="ctl-row">
            <label className="ctl-label">Aspect</label>
            <div className="pills aspect-pills">
              {Object.keys(ASPECTS).map((a) => (
                <button key={a} className={`pill ${aspect === a ? 'active' : ''}`} onClick={() => setAspect(a)}>{a}</button>
              ))}
              <button className={`pill ${aspect === 'custom' ? 'active' : ''}`} onClick={() => setCustomDims(customW, customH)}>W×H</button>
            </div>
          </div>

          {aspect === 'custom' && (
            <>
              <div className="ctl-row">
                <label className="ctl-label">Size px</label>
                <div className="dim-inputs">
                  <DimInput value={customW} onCommit={(v) => setCustomDims(v, customH)} />
                  <span className="dim-x">×</span>
                  <DimInput value={customH} onCommit={(v) => setCustomDims(customW, v)} />
                </div>
              </div>
              <div className="ctl-hint">Preview scales to fit — the exact size applies on export.</div>
            </>
          )}
        </div>

        <div className="ctl-section">
          <div className="ctl-section-title">Text</div>
          <ControlRow def={{ key: 'overlayTextEnabled', label: 'Add text', type: 'toggle', options: ['Off', 'On'], default: 'Off' }} value={values.overlayTextEnabled ?? 'Off'} onChange={value => setValue('overlayTextEnabled', value)} />
          {values.overlayTextEnabled === 'On' && TEXT_CONTROLS.map(def =>
            <ControlRow key={def.key} def={def} value={values[def.key] ?? def.default} onChange={value => setValue(def.key, value)} />)}
        </div>

        {isSocial && getTemplate(activeTemplateId).controls.some(def => def.key === 'postTheme' || def.key === 'fontStyle') && <div className="ctl-section">
          <div className="ctl-section-title">Appearance</div>
          {getTemplate(activeTemplateId).controls.filter(def => def.key === 'postTheme' || def.key === 'fontStyle').map(def =>
            <ControlRow key={def.key} def={def} value={values[def.key] ?? def.default} onChange={value => setValue(def.key, value)} />)}
        </div>}

        {!isSocial && <div className="ctl-section">
          <div className="ctl-section-title">Playback & Framing</div>
          <div className="ctl-row">
            <label className="ctl-label">FPS</label>
            <div className="pills pills-fit">
              {FPS_OPTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`pill ${fps === f ? 'active' : ''}`}
                  aria-pressed={fps === f}
                  onClick={() => setFps(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {!is3DMode && !isSocialMotion && (
            <ControlRow
              def={{ key: 'safe-area', label: 'Safe area', type: 'toggle', options: ['Off', 'On'], default: 'Off' }}
              value={safeArea ? 'On' : 'Off'}
              onChange={(value) => { if ((value === 'On') !== safeArea) toggleSafeArea(); }}
            />
          )}
        </div>}

        {!is3DMode && !isSocial && !isSocialMotion && (
          <div className="ctl-section">
            <div className="ctl-section-title">Background</div>
            {isStickerCanvas && (
              <div className="ctl-hint">The template starts on white. Your background choice is kept when switching presets.</div>
            )}
            <div className="ctl-row">
              <label className="ctl-label">Source</label>
              <div className="pills">
                {BG_SOURCES.map((src) => (
                  <button key={src.id} className={`pill ${background.source === src.id ? 'active' : ''}`} onClick={() => setBackground({ source: src.id })}>{src.label}</button>
                ))}
              </div>
            </div>

            {background.source === 'color' && (
              <>
                <div className="ctl-row">
                  <label className="ctl-label">Fill</label>
                  <div className="segmented">
                    <button className={`seg ${!background.gradient ? 'active' : ''}`} onClick={() => setBackground({ gradient: false })}>Solid</button>
                    <button className={`seg ${background.gradient ? 'active' : ''}`} onClick={() => setBackground({ source: 'color', gradient: true, gradientSpec: backgroundGradient })}>Gradient</button>
                  </div>
                </div>
                {!background.gradient && (
                  <div className="ctl-row">
                    <label className="ctl-label">Colour</label>
                    <ColorPicker
                      color={background.color}
                      alpha={currentAlpha}
                      showAlpha={true}
                      onChange={(hex, a) => setBackground({ color: hex, alpha: a })}
                    />
                  </div>
                )}
                {background.gradient && (
                  <>
                    <GradientEditor value={backgroundGradient} onChange={(gradientSpec) => setBackground({ source: 'color', gradient: true, gradientSpec })} />
                    <ControlRow def={BG_ALPHA} value={currentAlpha} onChange={(v) => setBackground({ alpha: Number(v) })} />
                  </>
                )}
              </>
            )}

            {background.source === 'image' && (
              <>
                <div className="ctl-row">
                  <label className="upload">
                    <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setBackground({ imageUrl: URL.createObjectURL(f) }); }} />
                    <span>{background.imageUrl ? 'Replace image' : 'Upload image'}</span>
                  </label>
                </div>
                <ControlRow def={{ key: 'bgblur', label: 'Blur', type: 'slider', min: 0, max: 100, step: 1, default: 28 }} value={background.blur} onChange={(v) => setBackground({ blur: Number(v) })} />
                <ControlRow def={BG_ALPHA} value={currentAlpha} onChange={(v) => setBackground({ alpha: Number(v) })} />
              </>
            )}

            {background.source === 'card' && (
              <>
                <div className="ctl-hint">Reflects the featured card — moves with animation.</div>
                <ControlRow def={{ key: 'bgblur', label: 'Blur', type: 'slider', min: 0, max: 100, step: 1, default: 28 }} value={background.blur} onChange={(v) => setBackground({ blur: Number(v) })} />
                <ControlRow def={BG_ALPHA} value={currentAlpha} onChange={(v) => setBackground({ alpha: Number(v) })} />
              </>
            )}
          </div>
        )}

        {!is3DMode && !isSocial && !isSocialMotion && (
          <div className="ctl-section">
            <div className="ctl-section-title">Overlays</div>
            <div className="ctl-row">
              <label className="upload">
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogo({ url: URL.createObjectURL(f) }); }} />
                <span>{logo.url ? 'Replace logo' : 'Upload logo'}</span>
              </label>
            </div>
            {logo.url && (
              <div className="ctl-row">
                <label className="ctl-label">Logo corner</label>
                <div className="pills">
                  {(['tl', 'tr', 'bl', 'br'] as const).map((p) => (
                    <button key={p} className={`pill ${logoX === (p.includes('r') ? 100 : 0) && logoY === (p.startsWith('b') ? 100 : 0) ? 'active' : ''}`} onClick={() => setLogo({ position: p, x: p.includes('r') ? 100 : 0, y: p.startsWith('b') ? 100 : 0 })}>{p.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            )}
            {logo.url && <>
              <ControlRow def={{ key: 'logo-x', label: 'Position X', type: 'slider', min: 0, max: 100, step: 1, default: logoX, unit: '%' }} value={logoX} onChange={(value) => setLogo({ x: Number(value) })} />
              <ControlRow def={{ key: 'logo-y', label: 'Position Y', type: 'slider', min: 0, max: 100, step: 1, default: logoY, unit: '%' }} value={logoY} onChange={(value) => setLogo({ y: Number(value) })} />
            </>}
            <div className="ctl-row">
              <label className="upload">
                <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioUrl(URL.createObjectURL(f)); }} />
                <span>{audioUrl ? 'Replace audio' : 'Upload audio'}</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
