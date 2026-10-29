import { getRendererInstance } from './rendererInstance';
import { useSceneStore } from '@/store/useSceneStore';
import { getTemplate } from '@/templates';

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

// Capture through the live preview renderer, which already owns the textures,
// media and WebGL context for the selected template.
export async function captureSlidePng(size: { width: number; height: number }, frame: number, templateId: string): Promise<Blob> {
  await nextFrame();
  await nextFrame();
  const deadline = Date.now() + 8000;
  let renderer = getRendererInstance();
  while ((!renderer || !renderer.extractCanvas()?.isConnected) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 50));
    renderer = getRendererInstance();
  }
  if (!renderer || useSceneStore.getState().activeTemplateId !== templateId) throw new Error('Preview is still loading. Please try again.');
  await useSceneStore.getState().rehydrateUploads();
  await renderer.prepareFrame?.();
  if (getRendererInstance() !== renderer) throw new Error('Template changed while rendering. Please try again.');
  const scene = useSceneStore.getState();
  const captureFrame = Math.max(0, Math.min(Math.round(scene.duration * scene.fps) - 1, frame));
  const scale = Math.min(size.width / scene.width, size.height / scene.height);
  const wasPlaying = scene.playing;
  if (wasPlaying) useSceneStore.setState({playing:false});
  try {
    if (wasPlaying) await nextFrame();
    renderer.setCaptureScale(scale);
    await renderer.seekVideos?.(captureFrame);
    renderer.renderFrame(captureFrame);
    const source = renderer.extractCanvas();
    const output = document.createElement('canvas');
    output.width = size.width;
    output.height = size.height;
    const context = output.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    const x = (size.width - source.width) / 2;
    const y = (size.height - source.height) / 2;
    context.drawImage(source, x, y);
    return await new Promise<Blob>((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not export the PNG. Please try again.')), 'image/png'));
  } finally {
    renderer.setCaptureScale(1);
    renderer.renderFrame(useSceneStore.getState().frame);
    if (wasPlaying) useSceneStore.setState({playing:true});
  }
}

export function pngFilename(templateId: string) {
  return getTemplate(templateId).meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
}
