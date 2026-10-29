'use client';

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useSceneStore } from '@/store/useSceneStore';
import { getTemplate } from '@/templates';

type Region = { key: string; x: number; y: number; width: number; height: number; fontSize: number; weight?: number; angle?: number };
const regions: Record<string, Region[]> = {
  'social-test': [{ key: 'heading', x: .1, y: .1, width: .8, height: .8, fontSize: .085, weight: 700 }],
  'social-testimonial': [
    { key: 'heading', x: 104.3176 / 1080, y: 216.4356 / 1350, width: 733 / 1080, height: 690 / 1350, fontSize: 76 / 1080, weight: 600 },
    { key: 'clientName', x: 276 / 1080, y: 766 / 1350, width: 690 / 1080, height: 86 / 1350, fontSize: 71 / 1080 },
    { key: 'clientRole', x: 276 / 1080, y: 852 / 1350, width: 690 / 1080, height: 55 / 1350, fontSize: 45 / 1080 },
  ],
  'social-with-without': [
    { key: 'withLabel', x: 69 / 1080, y: 80 / 1350, width: 135 / 1080, height: 65 / 1350, fontSize: 61 / 1080, weight: 600, angle: -3.13 },
    { key: 'withOne', x: 434 / 1080, y: 241 / 1350, width: 437 / 1080, height: 101 / 1350, fontSize: 35 / 1080 },
    { key: 'withTwo', x: 438 / 1080, y: 375 / 1350, width: 347 / 1080, height: 105 / 1350, fontSize: 35 / 1080 },
    { key: 'withThree', x: 438 / 1080, y: 525 / 1350, width: 383 / 1080, height: 72 / 1350, fontSize: 35 / 1080 },
    { key: 'withoutOne', x: 437 / 1080, y: 724 / 1350, width: 324 / 1080, height: 105 / 1350, fontSize: 35 / 1080 },
    { key: 'withoutTwo', x: 366 / 1080, y: 868 / 1350, width: 473 / 1080, height: 98 / 1350, fontSize: 35 / 1080, angle: -2.58 },
    { key: 'withoutThree', x: 431 / 1080, y: 994 / 1350, width: 351 / 1080, height: 107 / 1350, fontSize: 35 / 1080, angle: 1.27 },
    { key: 'withoutLabel', x: 584 / 1080, y: 1154 / 1350, width: 275 / 1080, height: 84 / 1350, fontSize: 61 / 1080, weight: 600, angle: -5.99 },
  ],
};

export default function CanvasTextEditor({ stageRef }: { stageRef: RefObject<HTMLDivElement | null> }) {
  const templateId = useSceneStore(s => s.activeTemplateId);
  const values = useSceneStore(s => s.values);
  const setValue = useSceneStore(s => s.setValue);
  const [geometry, setGeometry] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!regions[templateId]) return;
    const stage = stageRef.current;
    if (!stage) return;
    const update = () => setGeometry(stage.querySelector('canvas')?.getBoundingClientRect() ?? null);
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    const mutation = new MutationObserver(update);
    mutation.observe(stage, { childList: true });
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    update();
    return () => { observer.disconnect(); mutation.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [stageRef, templateId]);
  if (!geometry || !regions[templateId]) return null;
  const controls = getTemplate(templateId).controls;
  return createPortal(<>{regions[templateId].map(region => <textarea
    key={`${templateId}:${region.key}`}
    className="canvas-inline-text"
    aria-label={controls.find(control => control.key === region.key)?.label ?? region.key}
    spellCheck={false}
    value={String(values[region.key] ?? '')}
    onChange={event => setValue(region.key, event.target.value)}
    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); } }}
    style={{ position: 'fixed', zIndex: 30, left: geometry.left + region.x * geometry.width, top: geometry.top + region.y * geometry.height, width: region.width * geometry.width, height: region.height * geometry.height, fontFamily: templateId === 'social-with-without' ? '"Inter Tight", sans-serif' : 'Arial, sans-serif', fontSize: region.fontSize * geometry.width, fontWeight: region.weight ?? 400, transform: region.angle ? `rotate(${region.angle}deg)` : undefined, caretColor: values.postTheme === 'Light' ? '#171717' : '#fff' }}
  />)}</>, document.body);
}
