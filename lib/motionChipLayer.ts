import * as PIXI from 'pixi.js';
import { prepareSocialArtwork, socialArtwork } from './socialRenderer';
import type { SocialImages, SocialValues } from '@/templates/social/types';

// One cached canvas/texture per chip, composited by the normal layer renderer.
export class MotionChipLayer {
  readonly sprite = new PIXI.Sprite();
  private canvas = document.createElement('canvas');
  private texture?: PIXI.Texture;
  private images: SocialImages = {};
  private ready = '';
  private pending?: Promise<void>;
  private pendingKey = '';
  private disposed = false;
  constructor(private dirty: () => void) { this.sprite.anchor.set(0.5); }
  private key(id: string, values: SocialValues) { return JSON.stringify([id, socialArtwork(id).images(values)]); }
  async prepare(id: string, values: SocialValues) {
    const key = this.key(id, values);
    if (key === this.ready) return;
    if (key === this.pendingKey && this.pending) return this.pending;
    this.pendingKey = key;
    const pending = prepareSocialArtwork(id, values).then(images => {
      if (this.disposed || this.pendingKey !== key) return;
      this.images = images; this.ready = key; this.dirty();
    }).finally(() => { if (this.pendingKey === key) { this.pending = undefined; this.pendingKey = ''; } });
    this.pending = pending;
    return pending;
  }
  draw(id: string, values: SocialValues, seconds: number, width: number, height: number, resolution: number, duration?: number) {
    this.sprite.visible = this.ready === this.key(id, values);
    if (!this.sprite.visible) { void this.prepare(id, values).catch(() => {}); return; }
    const w = Math.max(1, Math.round(width * resolution));
    const h = Math.max(1, Math.round(height * resolution));
    if (!this.texture || this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
      const previous = this.texture;
      // The canvas is reused across preview/export resolutions. Texture.from
      // normally caches by canvas identity, which would return `previous` and
      // then destroy the texture we just assigned. This layer owns its texture.
      this.texture = PIXI.Texture.from(this.canvas, true); this.sprite.texture = this.texture;
      previous?.destroy(true);
    }
    const ctx = this.canvas.getContext('2d')!;
    const artwork = socialArtwork(id);
    ctx.resetTransform(); ctx.clearRect(0, 0, w, h);
    if (values.chipBackground !== 'Transparent') {
      ctx.fillStyle = artwork.background?.(values) ?? '#000000'; ctx.fillRect(0, 0, w, h);
    }
    const scale = Math.min(w / artwork.width, h / artwork.height);
    ctx.save(); if (!artwork.responsive) ctx.translate((w - artwork.width * scale) / 2, (h - artwork.height * scale) / 2);
    ctx.scale(scale, scale); artwork.draw(ctx, values, this.images, !artwork.usesSceneDuration && artwork.referenceDuration && duration ? seconds * artwork.referenceDuration / duration : seconds, artwork.responsive ? w / scale : undefined, artwork.responsive ? h / scale : undefined, duration); ctx.restore();
    this.texture.source.update(); this.sprite.width = width; this.sprite.height = height;
  }
  destroy() { this.disposed = true; this.texture?.destroy(true); this.sprite.destroy(); }
}
