import type { SocialArtwork, SocialValues } from '../types';
import { loadSocialFonts } from '@/lib/socialAssets';
import { REF_W, REF_H, CENTRE_X, CENTRE_Y, LINE_CX, CAP, CAP_RATIO, SPACE_TRIM, FIRST_AT, SETTLE, LEAD_RISE, LEAD_X, LEAD_Y, SCALE, SCATTER, TRAVEL, track, solve, dropOrder, beatAt } from './model';

function colors(v: SocialValues) {
  return { background: String(v.backgroundColor ?? '#faf9f6'), ink: String(v.textColor ?? '#191919') };
}
function number(v: SocialValues, key: string, fallback: number) { const n = Number(v[key]); return Number.isFinite(n) ? n : fallback; }
function layout(ctx: CanvasRenderingContext2D, v: SocialValues) {
  const words = String(v.text ?? 'Every scene is yours to own.').split(/\s+/).filter(Boolean);
  const size = CAP / CAP_RATIO;
  const font = `600 ${size}px "Inter Tight", sans-serif`;
  const letterSpacing = number(v, 'letterSpacing', 1.5) / 100 * size;
  ctx.font = font; ctx.letterSpacing = `${letterSpacing}px`;
  const widths = words.map(word => ctx.measureText(word).width);
  const space = ctx.measureText(' ').width + SPACE_TRIM * size;
  const slots = solve(widths, space, number(v, 'maxWidth', 330));
  const order = dropOrder(Math.max(0, words.length - 1));
  const ranks: number[] = []; order.forEach((word, rank) => { ranks[word] = rank; });
  return { words, widths, slots, ranks, font, size, letterSpacing };
}
const layouts = new WeakMap<SocialValues, ReturnType<typeof layout>>();
export const wordGatherArtwork: SocialArtwork = {
  width: 1280, height: 720, previewTime: 1.1, prepare: loadSocialFonts,
  background: v => colors(v).background, images: () => ({}),
  draw(ctx, v, _images, seconds = 0) {
    ctx.save();
    let data = layouts.get(v);
    if (!data) { data = layout(ctx, v); layouts.set(v, data); }
    const { words, widths, slots, ranks, font, size, letterSpacing } = data;
    const b = beatAt(seconds, Math.max(0, number(v, 'speed', 1)));
    const s = track(SCALE, b);
    const k = Math.max(1280 / REF_W, 720 / REF_H) * number(v, 'zoom', 100) / 100;
    ctx.beginPath(); ctx.rect(0, 0, 1280, 720); ctx.clip();
    ctx.translate(640, 360); ctx.scale(k * s, k * s); ctx.translate(-CENTRE_X, -CENTRE_Y);
    ctx.font = font; ctx.letterSpacing = `${letterSpacing}px`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const ink = colors(v).ink;
    for (let i = 0; i < words.length; i++) {
      let { x, baseline } = slots[i];
      ctx.fillStyle = ink;
      if (i === 0) {
        x += (LINE_CX - widths[0] / 2 - x) * (1 - track(LEAD_X, b));
        baseline += (CENTRE_Y + CAP / 2 - baseline + LEAD_RISE) * (1 - track(LEAD_Y, b));
      } else {
        const elapsed = b - FIRST_AT - ranks[i];
        if (elapsed < 0) continue;
        const travel = (1 - track(TRAVEL, elapsed)) * number(v, 'scatter', 1);
        const offset = SCATTER[(i - 1) % SCATTER.length];
        x += offset[0] * travel; baseline += offset[1] * travel;
        if (elapsed < SETTLE) ctx.fillStyle = String(v.accentColor ?? '#ff6b35');
      }
      ctx.fillText(words[i], x, baseline);
    }
    ctx.restore();
  },
};
