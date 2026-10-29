// Match the output size choices used by the Moonvine post exporter.
export const PNG_RESOLUTIONS = { '720p': 720, '1080p': 1080, '2K': 1440, '4K': 2160 } as const;
export type PngResolution = keyof typeof PNG_RESOLUTIONS | 'exact';

export function pngDimensions(res: PngResolution, scene: { width: number; height: number; aspect: string; customW: number; customH: number }) {
  if (res === 'exact' && scene.aspect === 'custom') return { width: scene.customW, height: scene.customH };
  const scale = PNG_RESOLUTIONS[res === 'exact' ? '1080p' : res] / Math.min(scene.width, scene.height);
  return { width: Math.max(1, Math.round(scene.width * scale)), height: Math.max(1, Math.round(scene.height * scale)) };
}
