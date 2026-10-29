import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { IRenderer } from './rendererTypes';
import { KpiParticleScene, enabled, numberValue } from './kpiParticleScene';
import { loadSocialFonts } from './socialAssets';
import { useSceneStore } from '@/store/useSceneStore';
import { drawKpiText } from '@/templates/social/kpi/draw';
import { socialPostColors } from '@/templates/social/theme';
import { drawTemplateText } from './templateText';

export class KpiRenderer implements IRenderer {
  private canvas!: HTMLCanvasElement;
  private cloud!: KpiParticleScene;
  private orbit!: OrbitControls;
  private pointer?: THREE.Vector2;
  private exporting = false;
  private syncing = false;
  private frame = 0;
  private exportButton?: HTMLButtonElement;
  private observer?: ResizeObserver;
  onDirty?: () => void;
  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.cloud = new KpiParticleScene();
    this.orbit = new OrbitControls(this.cloud.camera, canvas);
    this.orbit.enableDamping = false;
    this.orbit.addEventListener('change', this.orbitChanged);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    this.observer = new ResizeObserver(() => this.updateExportButton());
    this.observer.observe(canvas);
    await this.prepareFrame();
  }
  private orbitChanged = () => {
    if (this.syncing || this.exporting) return;
    const s = useSceneStore.getState();
    const position = this.cloud.camera.position.clone();
    // Store the unrotated camera so replay does not apply auto-rotation twice.
    if (enabled(s.values, 'orbit.autoRotate') && !enabled(s.values, 'orbit.lockRotation')) {
      const time = this.frame / s.fps * numberValue(s.values, 'speed', 1);
      position.sub(this.orbit.target).applyAxisAngle(THREE.Object3D.DEFAULT_UP, time * numberValue(s.values, 'orbit.autoRotateSpeed') * Math.PI / 30).add(this.orbit.target);
    }
    for (const axis of ['x', 'y', 'z'] as const) {
      s.setValue('camera.' + axis, position[axis]);
      s.setValue('camera.target' + axis.toUpperCase(), this.orbit.target[axis]);
    }
    this.onDirty?.();
  };
  private pointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.onDirty?.();
  };
  private pointerLeave = () => { this.pointer = undefined; this.onDirty?.(); };
  async prepareFrame() { await loadSocialFonts(); }
  resize(width: number, height: number, resolution = 1) {
    this.canvas.width = Math.max(1, Math.round(width * resolution)); this.canvas.height = Math.max(1, Math.round(height * resolution));
  }
  getFrameState(frame: number) { this.renderFrame(frame); }
  renderFrame(frame: number) {
    this.frame = frame;
    const s = useSceneStore.getState(), v = s.values;
    const ctx = this.canvas.getContext('2d'); if (!ctx) throw new Error('KPI canvas is unavailable');
    const scale = Math.min(this.canvas.width / 1080, this.canvas.height / 1312);
    const width = Math.max(1, Math.round(1080 * scale)), height = Math.max(1, Math.round(1312 * scale));
    const time = frame / s.fps * numberValue(v, 'speed', 1);
    const image = this.cloud.render(v, time, width, height, this.exporting ? undefined : this.pointer);
    ctx.resetTransform(); ctx.fillStyle = socialPostColors(v.postTheme).background; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const x = (this.canvas.width - width) / 2, y = (this.canvas.height - height) / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
    ctx.drawImage(image.canvas, x - image.overscan, y);
    ctx.translate(x, y); ctx.scale(scale, scale); drawKpiText(ctx, v); ctx.restore();
    drawTemplateText(ctx, s.width, s.height, v, this.canvas.width / s.width);
    this.canvas.style.cursor = enabled(v, 'material.showCursor') ? 'default' : 'none';
    this.syncing = true;
    try {
      this.orbit.enabled = !this.exporting;
      this.orbit.enableRotate = !enabled(v, 'orbit.lockRotation');
      this.orbit.enableZoom = enabled(v, 'orbit.enableZoom'); this.orbit.enablePan = enabled(v, 'orbit.enablePan');
      this.orbit.target.set(numberValue(v, 'camera.targetX'), numberValue(v, 'camera.targetY'), numberValue(v, 'camera.targetZ'));
      this.orbit.update();
    } finally { this.syncing = false; }
    this.updateExportButton();
  }
  private updateExportButton() {
    const v = useSceneStore.getState().values;
    if (!this.canvas.isConnected || !enabled(v, 'exportOptions.showButton')) { this.exportButton?.remove(); return; }
    if (!this.exportButton) {
      this.exportButton = document.createElement('button');
      this.exportButton.type = 'button';
      this.exportButton.addEventListener('click', () => {
        try {
          const link = document.createElement('a'); link.href = this.exportParticles();
          const name = String(useSceneStore.getState().values['exportOptions.fileName'] ?? 'particles.png').trim() || 'particles.png';
          link.download = name.toLowerCase().endsWith('.png') ? name : name + '.png'; link.click();
        } catch { this.exportButton!.textContent = 'Export failed. Try again'; }
      });
    }
    const button = this.exportButton;
    if (button.parentElement !== this.canvas.parentElement) this.canvas.parentElement?.appendChild(button);
    button.textContent = String(v['exportOptions.label'] ?? 'Export PNG');
    button.setAttribute('aria-label', button.textContent || 'Export particles PNG');
    const n = (key: string) => numberValue(v, 'exportOptions.' + key);
    const position = String(v['exportOptions.position']);
    const right = position.endsWith('right'), bottom = position.startsWith('bottom');
    Object.assign(button.style, {
      position: 'absolute', zIndex: '2',
      left: `${this.canvas.offsetLeft + (right ? this.canvas.clientWidth - n('offset') : n('offset'))}px`,
      top: `${this.canvas.offsetTop + (bottom ? this.canvas.clientHeight - n('offset') : n('offset'))}px`,
      transform: `translate(${right ? '-100%' : '0'}, ${bottom ? '-100%' : '0'})`,
      padding: `${n('paddingY')}px ${n('paddingX')}px`, borderRadius: `${n('radius')}px`,
      fontSize: `${n('fontSize')}px`, fontWeight: String(n('fontWeight')),
      background: String(v['exportOptions.background']), color: String(v['exportOptions.textColor']),
      border: enabled(v, 'exportOptions.showBorder') ? `${n('borderWidth')}px solid ${v['exportOptions.borderColor']}` : 'none',
      boxShadow: String(v['exportOptions.shadow']), cursor: 'pointer',
    });
  }
  captureFrame(frame: number) {
    const exporting = this.exporting; this.exporting = true;
    try { this.renderFrame(frame); return this.canvas.toDataURL('image/png'); }
    finally { this.exporting = exporting; }
  }
  exportParticles() {
    const s = useSceneStore.getState();
    const scale = Math.max(1, Math.min(4, numberValue(s.values, 'exportOptions.scale', 2)));
    try {
      const image = this.cloud.render(s.values, s.frame / s.fps * numberValue(s.values, 'speed', 1), 1080 * scale, 1312 * scale, undefined, true);
      const ctx = image.canvas.getContext('2d');
      if (ctx) drawTemplateText(ctx, 1080, 1312, s.values, scale);
      return image.canvas.toDataURL('image/png');
    } finally { this.renderFrame(s.frame); }
  }
  setCaptureScale(scale: number) { const s = useSceneStore.getState(); this.resize(s.width, s.height, scale); }
  extractCanvas() { return this.canvas; }
  syncAssets() { /* This template has no uploaded assets. */ }
  async beginVideoExport() { this.exporting = true; }
  endVideoExport() { this.exporting = false; this.onDirty?.(); }
  destroy() {
    this.observer?.disconnect(); this.exportButton?.remove();
    this.canvas.removeEventListener('pointermove', this.pointerMove); this.canvas.removeEventListener('pointerleave', this.pointerLeave);
    this.orbit.removeEventListener('change', this.orbitChanged); this.orbit.dispose(); this.cloud.destroy();
  }
}
