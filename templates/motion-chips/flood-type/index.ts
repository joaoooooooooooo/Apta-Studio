import type { Template } from '@/lib/types';
import { DEFAULT_LOOK, DURATION } from './params';

export const floodType: Template = {
  meta: { id: 'chip-flood-type', name: 'Flood Type', group: 'Motion Chips', kind: 'social-motion', socialRenderer: 'canvas', socialSize: { width: 1344, height: 620 }, defaultDuration: DURATION, defaultFps: 30, defaultEasing: { id: 'linear' }, isNew: true },
  controls: [
    { key: 'phrase', label: 'Text', type: 'text', multiline: true, default: DEFAULT_LOOK.lines.join(' '), section: 'Layout', description: 'Wraps automatically to fit the frame.' },
    { key: 'textBoxWidth', label: 'Text width', type: 'slider', min: 25, max: 100, step: 1, unit: '%', default: 100, section: 'Layout', description: 'Width of the text box within the canvas margins.' },
    { key: 'textScale', label: 'Text scale', type: 'slider', min: 1, max: 150, step: 1, unit: '%', default: 100, section: 'Layout', description: 'Changes the font size before the phrase wraps.' },
    { key: 'lineHeight', label: 'Line height', type: 'slider', min: 80, max: 180, step: 0.1, unit: '%', default: 108.4, section: 'Layout', description: 'Spacing between wrapped lines.' },
    { key: 'tracking', label: 'Tracking', type: 'slider', min: -8, max: 2, step: .25, unit: '%', default: -3.5, section: 'Layout' },
    { key: 'peakScale', label: 'Flood scale', type: 'slider', min: 1.5, max: 5.2, step: .05, default: 2.2, section: 'Motion' },
    { key: 'spin', label: 'Letter spin', type: 'slider', min: 0, max: 2, step: .05, default: 1, section: 'Motion' },
    { key: 'backgroundColor', label: 'Background', type: 'color', default: DEFAULT_LOOK.bg, section: 'Finish' },
    { key: 'textColor', label: 'Text', type: 'color', default: DEFAULT_LOOK.ink, section: 'Finish' },
  ],
  layerCount: () => 0, mediaCount: () => 0,
  transform: () => ({ x: 0, y: 0, scale: 1, rotation: 0, alpha: 1, depth: 0 }),
};
