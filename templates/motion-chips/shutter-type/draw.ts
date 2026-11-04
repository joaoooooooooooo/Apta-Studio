import type { SocialArtwork } from '../../social/types';
import { loadSocialFonts } from '@/lib/socialAssets';
import { easingBezier, type EasingSpec } from '@/lib/easing';
import { ShutterType } from './engine';
import { LOOP_MS, PAPER, SCENE_H, SCENE_W, shutterFramesAt } from './params';

let source: HTMLCanvasElement | undefined;
let engine: ShutterType | undefined;

function renderer() {
  if (!engine) {
    source = document.createElement('canvas');
    engine = new ShutterType(source, '"Inter Tight", sans-serif');
  }
  return engine;
}

export const shutterTypeArtwork: SocialArtwork = {
  width: SCENE_W,
  height: SCENE_H,
  responsive: true,
  usesSceneDuration: true,
  referenceDuration: LOOP_MS / 1000,
  previewTime: 0.3,
  prepare: loadSocialFonts,
  images: () => ({}),
  background: () => PAPER,
  draw(ctx, values, _images, seconds = 0, width = SCENE_W, height = SCENE_H, duration = LOOP_MS / 1000) {
    const active = renderer();
    if (!active.ok || !source) return;
    const text = (key: string, fallback: string) => String(values[key] ?? fallback).trim() || fallback;
    const number = (key: string, fallback: number) => {
      const value = Number(values[key]);
      return Number.isFinite(value) ? value : fallback;
    };
    const openingPhrase = text('openingPhrase', [values.designWord ?? 'Design', values.isWord ?? 'is', values.thinkingWord ?? 'thinking'].join(' '));
    const stackPhrase = text('stackPhrase', [values.madeWord ?? 'made', values.visualWord ?? 'visual'].join(' '));
    const curve = (key: string, fallback: [number, number, number, number]) =>
      easingBezier(values[key] as EasingSpec | undefined) ?? fallback;
    active.configure({
      phrases: [openingPhrase, stackPhrase],
      family: '"Inter Tight", sans-serif',
      weight: 600,
      typeScale: number('typeScale', 100) / 100,
      wordGap: number('wordGap', 0),
      letterSpacing: number('letterSpacing', 1.5) / 100,
      lineSpacing: number('lineSpacing', 112) / 100,
      stackGap: number('stackGap', Math.max(0, number('stackRowSpacing', 126) - 57 * number('typeScale', 100) / 100)),
      openingCurve: curve('openingCurve', [0.22, 0, 0.2, 1]),
      handoffCurve: curve('handoffCurve', [0.8, 0, 0.2, 1]),
      wordStagger: number('wordStagger', 2) * 0.5,
      openingExitLead: number('openingExitLead', 0.28) * 25,
      stackEntryLead: number('stackEntryLead', 0.2) * 25,
      stackEntryDuration: number('stackEntryDuration', 0.36) * 25,
      lag: number('shutterLag', 1),
      paper: text('paperColor', '#f6f3ea'),
      sky: text('skyColor', '#00afca'),
    });
    const transform = ctx.getTransform();
    const pixelWidth = Math.ceil(width * Math.hypot(transform.a, transform.b));
    const pixelHeight = Math.ceil(height * Math.hypot(transform.c, transform.d));
    active.resize(pixelWidth, pixelHeight);
    const frames = shutterFramesAt(seconds, duration, number('openingDuration', 0.8), number('stackDuration', 1.92));
    active.renderFrames(frames);
    ctx.drawImage(source, 0, 0, width, height);
  },
};
