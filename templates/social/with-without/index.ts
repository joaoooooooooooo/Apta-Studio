import type { Template } from '@/lib/types';

export const socialWithWithout: Template = {
  meta: { id: 'social-with-without', name: 'With / Without Apta', group: 'Social', kind: 'social', isNew: true, socialSize: { width: 1080, height: 1350 } },
  controls: [
    { key: 'withLabel', label: 'With heading', type: 'text', default: 'With' },
    { key: 'withOne', label: 'With · availability', type: 'text', multiline: true, default: 'Someone’s always available;\nprojects never pause.' },
    { key: 'withTwo', label: 'With · team', type: 'text', multiline: true, default: 'Designer, dev, motion,\ncopy: one team.' },
    { key: 'withThree', label: 'With · third point', type: 'text', multiline: true, default: 'sdad' },
    { key: 'withoutOne', label: 'Without · sick day', type: 'text', multiline: true, default: 'One sick day kills\nyour entire timeline.' },
    { key: 'withoutTwo', label: 'Without · freelancers', type: 'text', multiline: true, default: 'Four freelancers, four timelines.' },
    { key: 'withoutThree', label: 'Without · scope', type: 'text', multiline: true, default: 'Round 3 hits, suddenly\n“out of scope.”' },
    { key: 'withoutLabel', label: 'Without heading', type: 'text', default: 'Without' },
  ],
  layerCount: () => 0,
  mediaCount: () => 0,
  transform: () => ({ x: 0, y: 0, scale: 1, rotation: 0, alpha: 1, depth: 0 }),
};
