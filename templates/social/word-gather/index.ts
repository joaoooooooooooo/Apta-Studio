import type { Template } from '@/lib/types';

export const socialWordGather: Template = {
  meta: { id: 'social-word-gather', name: 'Word Gather', group: 'Motion Chips', kind: 'social-motion', socialRenderer: 'canvas',
    socialSize: { width: 1280, height: 720 }, defaultDuration: 3, isNew: true },
  controls: [
    { key: 'chipBackground', label: 'Layer background', type: 'toggle', options: ['Solid', 'Transparent'], default: 'Solid' },
    { key: 'text', label: 'Text', type: 'text', multiline: true, default: 'Every scene is yours to own.' },
    { key: 'letterSpacing', label: 'Letter spacing', type: 'slider', min: -2, max: 6, step: 0.25, unit: '%', default: 1.5 },
    { key: 'maxWidth', label: 'Text width', type: 'slider', min: 120, max: 650, step: 1, unit: 'px', default: 330 },
    { key: 'zoom', label: 'Text scale', type: 'slider', min: 25, max: 150, step: 1, unit: '%', default: 100 },
    { key: 'speed', label: 'Playback speed', type: 'slider', min: 0, max: 3, step: 0.05, unit: '×', default: 1 },
    { key: 'scatter', label: 'Scatter distance', type: 'slider', min: 0, max: 2, step: 0.05, unit: '×', default: 1 },
    { key: 'accentColor', label: 'Arrival color', type: 'color', default: '#ff6b35' },
    { key: 'backgroundColor', label: 'Background', type: 'color', default: '#faf9f6' },
    { key: 'textColor', label: 'Text', type: 'color', default: '#191919' },
  ],
  layerCount: () => 0,
  mediaCount: () => 0,
  transform: () => ({ x: 0, y: 0, scale: 1, rotation: 0, alpha: 1, depth: 0 }),
};
