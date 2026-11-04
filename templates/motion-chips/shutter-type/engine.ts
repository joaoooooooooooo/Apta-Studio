import {
  ADDUP_BASELINE,
  ADDUP_XHEIGHT,
  ADDUP_PITCH,
  type Bezier,
  OPENING_END_FRAME,
  FRAME_MS,
  LOOP_MS,
  SCENE_H,
  SCENE_W,
  STILL_FRAME,
  STREAMS_CAP,
  STREAMS_CENTRE,
  STREAMS_BASELINE,
  STREAMS_LIFT_PX,
  STRIPE_TAPS,
  type Stripe,
  addupScroll,
  bezier,
  buildStripes,
  isSky,
  streamsScale,
  stripeLagOfTap,
  stackRowRange,
  stackReveal,
  wrapWordRows,
} from "./params";

const MEASURE_PX = 200;
const SIDE_MARGIN = 72;

export class ShutterType {
  private ctx: CanvasRenderingContext2D | null;

  private taps: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }[] = [];
  private inner: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
  private stripes: Stripe[] = buildStripes();
  private raf = 0;
  private running = false;
  private elapsed = 0;
  private t0 = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;

  private capPerPx = 0.7;
  private xPerPx = 0.5;
  private phrases = ['Design is thinking', 'made visual'];
  private weight = 600;
  private typeScale = 1;
  private wordGap = 0;
  private letterSpacing = 0.015;
  private lineSpacing = 1.12;
  private stackGap = ADDUP_PITCH - ADDUP_XHEIGHT;
  private openingCurve: Bezier = [0.22, 0, 0.2, 1];
  private handoffCurve: Bezier = [0.8, 0, 0.2, 1];
  private wordStagger = 2;
  private openingExitLead = 7;
  private stackEntryLead = 5;
  private stackEntryDuration = 9;
  private lag = 1;
  private paper = '#f6f3ea';
  private sky = '#00afca';
  private offsetY = 0;

  readonly ok: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    private family: string = "sans-serif",
  ) {
    this.ctx = canvas.getContext("2d");
    this.ok = !!this.ctx;
    if (this.ok) {
      this.measure();
      this.resize();
    }
  }

  private font(px: number): string {
    return `${this.weight} ${px}px ${this.family}`;
  }

  configure(options: { phrases: string[]; weight: number; typeScale: number; wordGap: number; letterSpacing: number; lineSpacing: number; stackGap: number; openingCurve: Bezier; handoffCurve: Bezier; wordStagger: number; openingExitLead: number; stackEntryLead: number; stackEntryDuration: number; lag: number; paper: string; sky: string; family: string }) {
    const needsMeasure = this.family !== options.family || this.weight !== options.weight;
    this.family = options.family;
    this.weight = options.weight;
    this.phrases = options.phrases;
    this.typeScale = options.typeScale;
    this.wordGap = options.wordGap;
    this.letterSpacing = options.letterSpacing;
    this.lineSpacing = options.lineSpacing;
    this.stackGap = options.stackGap;
    this.openingCurve = options.openingCurve;
    this.handoffCurve = options.handoffCurve;
    this.wordStagger = options.wordStagger;
    this.openingExitLead = options.openingExitLead;
    this.stackEntryLead = options.stackEntryLead;
    this.stackEntryDuration = options.stackEntryDuration;
    this.lag = options.lag;
    this.paper = options.paper;
    this.sky = options.sky;
    if (needsMeasure) this.measure();
  }

  refreshFont(family?: string) {
    if (family) this.family = family;
    this.measure();
    if (!this.running) this.renderStill();
  }

  resize(pixelWidth?: number, pixelHeight?: number) {
    const c = this.canvas;
    const box = c.getBoundingClientRect();
    const w = Math.max(1, Math.round(pixelWidth ?? box.width ?? SCENE_W));
    const h = Math.max(1, Math.round(pixelHeight ?? box.height ?? SCENE_H));
    const dpr = pixelWidth ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    this.offsetY = (c.height / (c.width / SCENE_W) - SCENE_H) / 2;
    this.stripes = buildStripes(undefined, c.height / (c.width / SCENE_W));
    this.taps = [];
    for (let i = 0; i <= STRIPE_TAPS; i++) {
      const t = document.createElement("canvas");
      t.width = c.width;
      t.height = c.height;
      const tctx = t.getContext("2d");
      if (!tctx) continue;
      if (i < STRIPE_TAPS) this.taps.push({ canvas: t, ctx: tctx });
      else this.inner = { canvas: t, ctx: tctx };
    }
    if (!this.running) this.renderStill();
  }

  private measure() {
    const off = document.createElement("canvas");
    const g = off.getContext("2d");
    if (!g) return;
    g.font = this.font(MEASURE_PX);
    this.capPerPx = (g.measureText('E').actualBoundingBoxAscent || 140) / MEASURE_PX;
    this.xPerPx = (g.measureText('x').actualBoundingBoxAscent || 100) / MEASURE_PX;
  }

  private layout(ctx: CanvasRenderingContext2D, phrase: string, desiredPx: number) {
    const words = phrase.trim().split(/\s+/).filter(Boolean);
    const measure = (px: number) => {
      ctx.font = this.font(px);
      ctx.letterSpacing = `${px * this.letterSpacing}px`;
      const widths = words.map(word => ctx.measureText(word).width);
      const gap = ctx.measureText(' ').width + this.wordGap;
      return { widths, gap, total: widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, words.length - 1) };
    };
    const first = measure(desiredPx);
    const px = desiredPx * Math.min(1, (SCENE_W - 2 * SIDE_MARGIN) / Math.max(1, first.total));
    const { widths, gap, total } = measure(px);
    let x = (SCENE_W - total) / 2;
    return words.map((word, i) => {
      const item = { word, x };
      x += widths[i] + gap;
      return item;
    });
  }

  private openingLayout(ctx: CanvasRenderingContext2D, phrase: string, desiredPx: number) {
    const paragraphs = phrase.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim().split(/\s+/).filter(Boolean));
    const words = paragraphs.flat();
    const maxWidth = SCENE_W - 2 * SIDE_MARGIN;
    const maxHeight = 210;
    let px = desiredPx;
    let rows: number[][] = [];
    let widths: number[] = [];
    let gap = 0;
    const rowsFor = (measured: number[], space: number) => {
      const lines: number[][] = [];
      let start = 0;
      for (const paragraph of paragraphs) {
        lines.push(...wrapWordRows(measured.slice(start, start + paragraph.length), space, maxWidth).map(row => row.map(index => index + start)));
        start += paragraph.length;
      }
      return lines;
    };
    for (let pass = 0; pass < 4; pass++) {
      ctx.font = this.font(px);
      ctx.letterSpacing = `${px * this.letterSpacing}px`;
      widths = words.map(word => ctx.measureText(word).width);
      gap = ctx.measureText(' ').width + this.wordGap;
      const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, words.length - 1);
      if (paragraphs.length === 1 && total <= maxWidth * 1.12) {
        if (total > maxWidth) { px *= maxWidth / total; continue; }
        rows = [words.map((_, i) => i)];
      } else {
        const longest = Math.max(0, ...widths);
        if (longest > maxWidth) { px *= maxWidth / longest; continue; }
        rows = rowsFor(widths, gap);
      }
      const lineHeight = px * this.lineSpacing;
      if (rows.length * lineHeight > maxHeight) { px *= maxHeight / (rows.length * lineHeight); continue; }
      break;
    }
    ctx.font = this.font(px);
    ctx.letterSpacing = `${px * this.letterSpacing}px`;
    widths = words.map(word => ctx.measureText(word).width);
    gap = ctx.measureText(' ').width + this.wordGap;
    rows = rowsFor(widths, gap);
    const lineHeight = px * this.lineSpacing;
    return rows.flatMap((row, line) => {
      const width = row.reduce((sum, index) => sum + widths[index], 0) + gap * Math.max(0, row.length - 1);
      let x = (SCENE_W - width) / 2;
      return row.map(index => {
        const item = { word: words[index], x, y: (line - (rows.length - 1) / 2) * lineHeight, index };
        x += widths[index] + gap;
        return item;
      });
    });
  }

  private scene(ctx: CanvasRenderingContext2D, f: number, ink: string, take: 'opening' | 'stack') {
    const k = this.canvas.width / SCENE_W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, this.offsetY * k);
    ctx.fillStyle = ink;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    if (take === 'opening') {

      const px = STREAMS_CAP * this.typeScale / this.capPerPx;
      ctx.font = this.font(px);
      const words = this.openingLayout(ctx, this.phrases[0], px);
      words.forEach(({ word, x, y, index }) => {
        const delay = words.length > 1 ? index / (words.length - 1) * this.wordStagger : 0;
        const arrived = bezier((f - delay) / 2, this.openingCurve);
        ctx.fillText(word, x, STREAMS_BASELINE + y + 10 * (1 - arrived));
      });
    } else {
      const px = ADDUP_XHEIGHT * this.typeScale / this.xPerPx;
      ctx.font = this.font(px);
      const words = this.layout(ctx, this.phrases[1], px);
      words.forEach(({ word, x }, i) => {
        const pitch = ADDUP_XHEIGHT * this.typeScale + this.stackGap;
        const base = ADDUP_BASELINE - addupScroll(f - (i % 2 ? 0.4 : 0), pitch) % pitch;
        const top = -this.offsetY;
        const bottom = SCENE_H + this.offsetY;
        const [first, last] = stackRowRange(base, top, bottom, pitch);
        for (let r = first; r <= last; r++) {
          ctx.fillText(word, x, base + r * pitch);
        }
      });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private renderTake(f: number, ink: string, take: 'opening' | 'stack', exitFrame = f) {
    const ctx = this.ctx;
    const inner = this.inner;
    if (!ctx || !inner || this.taps.length < STRIPE_TAPS) return;
    ctx.save();
    const W = this.canvas.width;
    const H = this.canvas.height;
    for (let i = 0; i < STRIPE_TAPS; i++) {
      const from = take === 'opening' ? 0 : OPENING_END_FRAME - this.stackEntryLead;
      const sampled = Math.max(from, f - stripeLagOfTap(i) * this.lag / 2.4);
      this.scene(this.taps[i].ctx, sampled, ink, take);
    }

    const k = W / SCENE_W;
    inner.ctx.setTransform(1, 0, 0, 1, 0, 0);
    inner.ctx.clearRect(0, 0, W, H);
    for (const s of this.stripes) {
      const y0 = Math.round(s.y0 * k);
      const y1 = Math.min(H, Math.round(s.y1 * k));
      if (y1 <= y0) continue;
      inner.ctx.drawImage(this.taps[s.tap].canvas, 0, y0, W, y1 - y0, 0, y0, W, y1 - y0);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (take === 'opening') {
      const scale = streamsScale(f);
      const lift = STREAMS_LIFT_PX * bezier((exitFrame - (OPENING_END_FRAME - this.openingExitLead)) / 10, this.handoffCurve);
      const cx = STREAMS_CENTRE.x * k;
      const cy = (STREAMS_CENTRE.y + this.offsetY) * k;
      ctx.translate(cx, cy - lift * k);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      ctx.drawImage(inner.canvas, 0, 0);
    } else {
      const reveal = stackReveal(f, this.stackEntryLead, this.stackEntryDuration, this.handoffCurve);
      ctx.beginPath();
      ctx.rect(0, H * (1 - reveal), W, H * reveal);
      ctx.clip();
      ctx.drawImage(inner.canvas, 0, 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.restore();
  }

  render(f: number) {
    this.renderFrames({ opening: f, exit: f, stack: f, afterCut: f >= OPENING_END_FRAME });
  }

  renderFrames({ opening: openingFrame, exit: exitFrame, stack: stackFrame, afterCut }: { opening: number; exit: number; stack: number; afterCut: boolean }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const sky = isSky(afterCut ? stackFrame : openingFrame);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = sky ? this.sky : this.paper;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const ink = sky ? this.paper : this.sky;
    const reveal = stackReveal(stackFrame, this.stackEntryLead, this.stackEntryDuration, this.handoffCurve);
    if (!afterCut && reveal < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.canvas.width, this.canvas.height * (1 - reveal));
      ctx.clip();
      this.renderTake(openingFrame, ink, 'opening', exitFrame);
      ctx.restore();
    }
    if (stackFrame >= OPENING_END_FRAME - this.stackEntryLead) this.renderTake(stackFrame, ink, 'stack');
  }

  start() {
    if (this.running || !this.ok) return;
    this.running = true;
    this.t0 = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const t = (this.elapsed + (now - this.t0)) % LOOP_MS;
      this.render(t / FRAME_MS);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this.running) {
      this.elapsed = (this.elapsed + (performance.now() - this.t0)) % LOOP_MS;
    }
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  renderStill() {
    this.render(STILL_FRAME);
  }

  destroy() {
    this.stop();
    this.taps = [];
    this.inner = null;
    this.ctx = null;
  }
}

export const SCENE_ASPECT = SCENE_W / SCENE_H;

