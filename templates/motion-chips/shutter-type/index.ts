import type { Template } from '@/lib/types';
import { LOOP_MS } from './params';

export const shutterType: Template = {
  meta: {
    id: 'chip-shutter-type', name: 'Shutter Type', group: 'Motion Chips',
    kind: 'social-motion', socialRenderer: 'canvas',
    socialSize: { width: 1200, height: 675 },
    defaultDuration: LOOP_MS / 1000, defaultFps: 25,
    defaultEasing: { id: 'linear' }, isNew: true,
  },
  controls: [
    { key: 'openingPhrase', label: 'Opening phrase', type: 'text', multiline: true, default: 'Design is thinking', section: 'Layout' },
    { key: 'stackPhrase', label: 'Stack phrase', type: 'text', default: 'made visual', section: 'Layout' },
    { key: 'typeScale', label: 'Type size', type: 'slider', min: 50, max: 150, step: 1, unit: '%', default: 100, section: 'Layout' },
    { key: 'wordGap', label: 'Word spacing', type: 'slider', min: 0, max: 40, step: 1, unit: 'px', default: 0, section: 'Layout' },
    { key: 'letterSpacing', label: 'Letter spacing', type: 'slider', min: -2, max: 6, step: 0.25, unit: '%', default: 1.5, section: 'Layout' },
    { key: 'lineSpacing', label: 'Line spacing', type: 'slider', min: 80, max: 160, step: 1, unit: '%', default: 112, section: 'Layout' },
    { key: 'stackGap', label: 'Stack gap', type: 'slider', min: 0, max: 180, step: 1, unit: 'px', default: 69, section: 'Layout', description: 'Empty space between repeated text rows in the second take.' },
    { key: 'openingDuration', label: 'Opening take', type: 'slider', min: 0.2, max: 60, step: 0.04, unit: 's', default: 0.8, section: 'Motion', description: 'Time the opening phrase stays on screen. Entrance and handoff keep their own speed.' },
    { key: 'stackDuration', label: 'Stack take', type: 'slider', min: 0.2, max: 60, step: 0.04, unit: 's', default: 1.92, section: 'Motion', description: 'Time the stacked phrase stays on screen. Its entrance keeps its own speed.' },
    { key: 'shutterLag', label: 'Shutter lag', type: 'slider', min: 0, max: 4, step: 0.1, default: 1, section: 'Motion' },
    { key: 'wordStagger', label: 'Word stagger', type: 'slider', min: 0, max: 8, step: 0.25, default: 2, section: 'Motion', description: 'Time between the first and last word settling.' },
    { key: 'openingExitLead', label: 'Opening exit lead', type: 'slider', min: 0.08, max: 0.48, step: 0.04, unit: 's', default: 0.28, section: 'Motion', description: 'How early the opening phrase starts lifting before the cut.' },
    { key: 'stackEntryLead', label: 'Stack entry lead', type: 'slider', min: 0, max: 0.32, step: 0.04, unit: 's', default: 0.2, section: 'Motion', description: 'How early the stack starts entering before the cut.' },
    { key: 'stackEntryDuration', label: 'Stack entry curve', type: 'slider', min: 0.16, max: 0.8, step: 0.04, unit: 's', default: 0.36, section: 'Motion', description: 'How quickly the stack fills its reveal window before the cut.' },
    { key: 'paperColor', label: 'Paper', type: 'color', default: '#f6f3ea', section: 'Finish' },
    { key: 'skyColor', label: 'Sky', type: 'color', default: '#00afca', section: 'Finish' },
  ],
  layerCount: () => 0,
  mediaCount: () => 0,
  transform: () => ({ x: 0, y: 0, scale: 1, rotation: 0, alpha: 1, depth: 0 }),
};
