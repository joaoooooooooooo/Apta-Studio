import { announceTitleArtwork } from '@/templates/motion-chips/announce-title/draw';
import type { IRenderer } from './rendererTypes';
import { useSceneStore } from '@/store/useSceneStore';
import { loadSocialFonts, loadSocialImages } from './socialAssets';
import { socialTheme } from '@/templates/social/theme';
import { drawTemplateText } from './templateText';
import { testArtwork } from '@/templates/social/test/draw';
import { testimonialArtwork } from '@/templates/social/testimonial/draw';
import { withWithoutArtwork } from '@/templates/social/with-without/draw';
import { channelThreadArtwork } from '@/templates/social/channel-thread/draw';
import { wordGatherArtwork } from '@/templates/social/word-gather/draw';
import type { SocialArtwork, SocialImages, SocialValues } from '@/templates/social/types';

const artworks: Record<string, SocialArtwork> = { 'social-test': testArtwork, 'social-testimonial': testimonialArtwork, 'social-with-without': withWithoutArtwork, 'social-channel-thread': channelThreadArtwork, 'social-word-gather': wordGatherArtwork, 'chip-announce-title': announceTitleArtwork };
export function socialArtwork(id: string): SocialArtwork {
  const artwork = artworks[id];
  if (!artwork) throw new Error('Unknown social template: ' + id);
  return artwork;
}
export async function prepareSocialArtwork(id: string, values: SocialValues) {
  const artwork = socialArtwork(id);
  const [, images] = await Promise.all([artwork.prepare?.() ?? (artwork.fonts ? loadSocialFonts() : Promise.resolve()), loadSocialImages(artwork.images(values), artwork.optionalImages)]);
  return images;
}
export function drawSocialArtwork(canvas: HTMLCanvasElement, id: string, values: SocialValues, images: SocialImages, seconds = 0) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  const artwork = socialArtwork(id);
  ctx.resetTransform(); ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  // Fixed artwork proportions, centered on other aspect ratios without distortion.
  const scale = Math.min(canvas.width / artwork.width, canvas.height / artwork.height);
  ctx.fillStyle = artwork.background?.(values) ?? socialTheme.background.primary;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!artwork.responsive) ctx.translate((canvas.width - artwork.width * scale) / 2, (canvas.height - artwork.height * scale) / 2);
  ctx.scale(scale, scale);
  artwork.draw(ctx, values, images, seconds, artwork.responsive ? canvas.width / scale : undefined, artwork.responsive ? canvas.height / scale : undefined);
  ctx.restore();
}

// Shared by the stage, exports and posters. Animation is driven only by the requested frame.
export class SocialRenderer implements IRenderer {
  private canvas!: HTMLCanvasElement;
  private resources: SocialImages = {};
  private readyKey = '';
  private pendingKey = '';
  private pending?: Promise<void>;
  onDirty?: () => void;
  async init(canvas: HTMLCanvasElement) { this.canvas = canvas; }
  resize(width: number, height: number, resolution = 1) {
    this.canvas.width = Math.round(width * resolution);
    this.canvas.height = Math.round(height * resolution);
  }
  private key() {
    const s = useSceneStore.getState();
    return JSON.stringify([s.activeTemplateId, socialArtwork(s.activeTemplateId).images(s.values)]);
  }
  async prepareFrame() {
    const key = this.key();
    if (key === this.readyKey) return;
    if (key === this.pendingKey && this.pending) return this.pending;
    const s = useSceneStore.getState();
    this.pendingKey = key;
    this.pending = prepareSocialArtwork(s.activeTemplateId, s.values).then((images) => {
      if (this.pendingKey !== key) return;
      this.resources = images; this.readyKey = key; this.onDirty?.();
    }).finally(() => { if (this.pendingKey === key) { this.pending = undefined; this.pendingKey = ''; } });
    await this.pending;
    if (this.key() !== this.readyKey) await this.prepareFrame();
  }
  getFrameState(frame = 0) { this.renderFrame(frame); }
  renderFrame(frame = 0) {
    const s = useSceneStore.getState();
    if (!artworks[s.activeTemplateId]) return;
    if (this.key() !== this.readyKey) {
      this.prepareFrame().catch(() => {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = '#666666'; ctx.font = '16px sans-serif';
        ctx.fillText('Could not load the post assets. Try exporting to retry.', 20, 40);
      });
      return;
    }
    drawSocialArtwork(this.canvas, s.activeTemplateId, s.values, this.resources, frame / s.fps);
    const ctx = this.canvas.getContext('2d');
    if (ctx) drawTemplateText(ctx, s.width, s.height, s.values, this.canvas.width / s.width);
  }
  captureFrame(frame = 0) { this.renderFrame(frame); return this.canvas.toDataURL('image/png'); }
  setCaptureScale(k: number) { const s = useSceneStore.getState(); this.resize(s.width, s.height, k); }
  extractCanvas() { return this.canvas; }
  syncAssets() { /* Images load together with fonts in prepareFrame. */ }
  destroy() { this.pendingKey = ''; this.readyKey = ''; }
}
