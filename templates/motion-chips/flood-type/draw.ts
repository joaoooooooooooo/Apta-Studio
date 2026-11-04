import type { SocialArtwork, SocialValues } from '../../social/types';
import { loadSocialFonts } from '@/lib/socialAssets';
import { DEFAULT_LOOK, DURATION, ENTER_TABLE, ENTER_TICKS, ENTER_STAGGER, ESCAPE_START, ESCAPE_TICKS, FALL_TABLE, FONT_WEIGHT, ROT_TABLE, SCALE_TABLE, ZOOM_START, ZOOM_TICKS, floodTickAt, hash, sample } from './params';

const text = (v: SocialValues, key: string) => String(v[key] ?? '').trim();
const number = (v: SocialValues, key: string, fallback: number) => Number.isFinite(Number(v[key])) ? Number(v[key]) : fallback;
const widthOf = (ctx: CanvasRenderingContext2D, line: string, track: number) => ctx.measureText(line).width + Math.max(0, [...line].length - 1) * track;

interface Glyph { ch: string; x: number; y: number; px: number; py: number; delay: number; spread: number; settle: number; escape: number; }
interface Pose { glyph: Glyph; x: number; y: number; scale: number; angle: number; }

function wrapWords(widths: number[], gap: number, maxWidth: number): number[][] {
  const rows: number[][] = [];
  let row: number[] = [], used = 0;
  widths.forEach((width, index) => {
    if (row.length && used + gap + width > maxWidth) { rows.push(row); row = []; used = 0; }
    used += (row.length ? gap : 0) + width;
    row.push(index);
  });
  if (row.length) rows.push(row);
  return rows;
}

export function glyphsFor(ctx: CanvasRenderingContext2D, phrase: string, width: number, height: number, textBoxWidth: number, textScale: number, lineHeight: number, tracking: number, spin: number) {
  const paragraphs = phrase.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim().split(/\s+/).filter(Boolean)).filter(row => row.length);
  const words = paragraphs.flat();
  const probe = 100;
  ctx.font = `${FONT_WEIGHT} ${probe}px "Inter Tight", sans-serif`;
  const capProbe = ctx.measureText('H').actualBoundingBoxAscent || 70;
  const maxWidth = width * .84 * textBoxWidth;
  const layoutAt = (px: number) => {
    ctx.font = `${FONT_WEIGHT} ${px}px "Inter Tight", sans-serif`;
    ctx.letterSpacing = '0px';
    const track = tracking * px;
    const rows: string[] = [];
    for (const paragraph of paragraphs) {
      const measured = paragraph.map(word => widthOf(ctx, word, track));
      const gap = ctx.measureText(' ').width + track;
      rows.push(...wrapWords(measured, gap, maxWidth).map(indices => indices.map(index => paragraph[index]).join(' ')));
    }
    return rows;
  };
  const px = height * .3 * probe / capProbe * textScale;
  const lines = layoutAt(px);
  ctx.font = `${FONT_WEIGHT} ${px}px "Inter Tight", sans-serif`;
  const cap = capProbe * px / probe;
  const pitch = cap * lineHeight;
  const baselines = lines.map((_, i) => (i - (lines.length - 1) / 2) * pitch);
  const measures = lines.map(line => ctx.measureText(line));
  const top = baselines[0] - measures[0].actualBoundingBoxAscent;
  const bottom = baselines[lines.length - 1] + measures[lines.length - 1].actualBoundingBoxDescent;
  const middle = (top + bottom) / 2;
  const half = (bottom - top) / 2;
  const out: Glyph[] = [];
  let index = 0;
  lines.forEach((line, li) => {
    const track = tracking * px;
    let pen = -widthOf(ctx, line, track) / 2;
    for (const ch of line) {
      const m = ctx.measureText(ch);
      if (ch !== ' ') {
        const inkLeft = -m.actualBoundingBoxLeft, inkRight = m.actualBoundingBoxRight;
        const sampleSpin = (channel: number, max: number) => (hash(index, channel) < .5 ? -1 : 1) * max * spin * Math.pow(hash(index, channel + 1), 2.6);
        out.push({ ch, x: pen, y: baselines[li] - middle, px: (inkLeft + inkRight) / 2, py: (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2,
          delay: 0, spread: 0, settle: sampleSpin(0, 95), escape: sampleSpin(2, 130) });
      }
      pen += m.width + track;
      index++;
    }
  });
  const maxDist = Math.max(1, ...out.map(g => Math.abs(g.x + g.px)));
  out.forEach(g => { g.spread = (g.x + g.px) / maxDist; g.delay = (1 - Math.abs(g.spread)) * ENTER_STAGGER; });
  return { glyphs: out, px, half };
}

const layoutCache = new Map<string, ReturnType<typeof glyphsFor>>();
function cachedGlyphs(ctx: CanvasRenderingContext2D, phrase: string, width: number, height: number, textBoxWidth: number, textScale: number, lineHeight: number, tracking: number, spin: number) {
  const key = JSON.stringify([phrase, width, height, textBoxWidth, textScale, lineHeight, tracking, spin]);
  let layout = layoutCache.get(key);
  if (!layout) {
    layout = glyphsFor(ctx, phrase, width, height, textBoxWidth, textScale, lineHeight, tracking, spin);
    if (layoutCache.size >= 24) layoutCache.clear();
    layoutCache.set(key, layout);
  }
  return layout;
}

function pose(g: Glyph, tick: number, width: number, height: number, half: number, peak: number): Omit<Pose, 'glyph'> {
  const zoom = sample(SCALE_TABLE, (tick - ZOOM_START) / ZOOM_TICKS);
  const rotation = sample(ROT_TABLE, (tick - ZOOM_START) / ZOOM_TICKS);
  const drop = sample(FALL_TABLE, (tick - ESCAPE_START) / ESCAPE_TICKS);
  const scale = 1 + (peak - 1) * zoom;
  const arrive = sample(ENTER_TABLE, (tick - g.delay) / ENTER_TICKS);
  return {
    x: width / 2 + (g.x + g.px) * scale * (1 - .1 * zoom) + g.spread * (-.108 * zoom * width * .06 + .16 * drop * width),
    y: height / 2 + (g.y + g.py) * scale + drop * (height / 2 + half * scale * 1.08) - (1 - arrive) * 1.3 * half * scale,
    scale,
    angle: (g.settle * rotation + g.escape * drop) * Math.PI / 180,
  };
}

export const floodTypeArtwork: SocialArtwork = {
  width: 1344, height: 620, responsive: true, usesSceneDuration: true, referenceDuration: DURATION, previewTime: .75,
  prepare: loadSocialFonts, images: () => ({}), background: values => text(values, 'backgroundColor') || DEFAULT_LOOK.bg,
  draw(ctx, values, _images, seconds = 0, width = 1344, height = 620, duration = DURATION) {
    const legacy = [text(values, 'firstLine'), text(values, 'secondLine')].filter(Boolean).join(' ');
    const phrase = legacy && text(values, 'phrase') === DEFAULT_LOOK.lines.join(' ') ? legacy : text(values, 'phrase') || legacy || DEFAULT_LOOK.lines.join(' ');
    const tick = floodTickAt(seconds, duration);
    ctx.fillStyle = text(values, 'backgroundColor') || DEFAULT_LOOK.bg; ctx.fillRect(0, 0, width, height);
    const { glyphs, px, half } = cachedGlyphs(ctx, phrase, width, height, number(values, 'textBoxWidth', 100) / 100, number(values, 'textScale', 100) / 100, number(values, 'lineHeight', 108.4) / 100, number(values, 'tracking', -3.5) / 100, number(values, 'spin', 1));
    ctx.font = `${FONT_WEIGHT} ${px}px "Inter Tight", sans-serif`;
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = text(values, 'textColor') || DEFAULT_LOOK.ink;
    const peak = number(values, 'peakScale', 2.2);
    const slots: Pose[] = glyphs.map(glyph => ({ glyph, ...pose(glyph, tick, width, height, half, peak) }));
    const drawGlyph = (slot: Pose) => {
      ctx.save(); ctx.translate(slot.x, slot.y); ctx.rotate(slot.angle); ctx.scale(slot.scale, slot.scale);
      ctx.fillText(slot.glyph.ch, -slot.glyph.px, -slot.glyph.py); ctx.restore();
    };
    for (const slot of slots) drawGlyph(slot);
  },
};
