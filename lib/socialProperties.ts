import type { Template } from './types';
import type { SceneState } from '@/store/useSceneStore';

export function socialProperties(template: Template, values: Record<string, unknown>, timing: { duration: number; fps: number; width: number; height: number; easing: unknown }) {
  const properties: Record<string, unknown> = {};
  for (const def of template.controls) {
    const rule = def.visibleWhen;
    if (rule && ((rule.equals !== undefined && values[rule.key] !== rule.equals)
      || (rule.not !== undefined && values[rule.key] === rule.not))) continue;
    let value = values[def.key] ?? def.default;
    if (def.type === 'toggle' && def.options?.join(',') === 'On,Off') value = value === 'On';
    const [group, key] = def.key.split('.');
    if (key) {
      const nested = (properties[group] ??= {}) as Record<string, unknown>;
      nested[key] = value;
    } else properties[group] = value;
  }
  if (values.overlayTextEnabled === 'On') properties.text = {
    content: String(values.overlayText ?? ''),
    size: Number(values.overlayTextSize ?? 72),
    color: String(values.overlayTextColor ?? '#191919'),
    align: String(values.overlayTextAlign ?? 'Center').toLowerCase(),
    x: Number(values.overlayTextX ?? 50),
    y: Number(values.overlayTextY ?? 50),
  };
  return { version: 1, templateId: template.meta.id, size: { width: timing.width, height: timing.height },
    ...(template.meta.kind !== 'social' ? { timing: { duration: timing.duration, fps: timing.fps, easing: timing.easing } } : {}), properties };
}

export function motionProperties(
  template: Template,
  values: Record<string, unknown>,
  timing: { duration: number; fps: number; width: number; height: number; easing: unknown },
  scene: Pick<SceneState, 'background' | 'sceneCamera' | 'tracks' | 'effects'>,
) {
  return {
    ...socialProperties(template, values, timing),
    scene: {
      background: scene.background,
      camera: scene.sceneCamera,
      tracks: scene.tracks,
      effects: scene.effects,
    },
  };
}
