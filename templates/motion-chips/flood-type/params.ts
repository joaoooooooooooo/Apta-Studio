export const FPS = 30;
export const FONT_WEIGHT = 600;
export const ENTER_TICKS = 14;
export const ENTER_STAGGER = 3;
export const HOLD_TICKS = 10;
export const ZOOM_START = ENTER_TICKS + ENTER_STAGGER + HOLD_TICKS + 2;
export const ZOOM_TICKS = 22;
export const ESCAPE_START = ZOOM_START + 18;
export const ESCAPE_TICKS = 15;
export const CYCLE_TICKS = ESCAPE_START + ESCAPE_TICKS;
export const DURATION = CYCLE_TICKS / FPS;

export const SCALE_TABLE = [0, .008, .02, .04, .075, .14, .29, .56, .8, .94, 1.02, 1.058, 1.045, 1.022, 1.006, 1] as const;
export const ROT_TABLE = [0, 0, .08, .269, .461, .613, .715, .804, .865, .918, .941, .968, .99, 1] as const;
export const ENTER_TABLE = [0, .021, .052, .104, .196, .372, .632, .826, .951, 1.021, 1.043, 1.032, 1.013, 1] as const;
export const FALL_TABLE = [0, .01, .022, .036, .057, .085, .122, .169, .226, .302, .407, .555, .778, 1] as const;

export const DEFAULT_LOOK = { lines: ['Full', 'Bleed'], bg: '#0b3d2e', ink: '#d8ff4f' } as const;

export function floodTickAt(seconds: number, duration: number): number {
  const raw = Math.max(0, seconds) * FPS;
  const entryEnd = ENTER_TICKS + ENTER_STAGGER;
  const zoomAt = Math.max(entryEnd, Math.max(0, duration) * FPS - (CYCLE_TICKS - ZOOM_START));
  if (raw <= entryEnd) return raw;
  if (raw < zoomAt) return entryEnd;
  return Math.min(CYCLE_TICKS - .0001, ZOOM_START + raw - zoomAt);
}

export function sample(table: readonly number[], u: number): number {
  if (!table.length) return 0;
  if (table.length === 1 || !(u > 0)) return table[0];
  if (u >= 1) return table[table.length - 1];
  const x = u * (table.length - 1), i = Math.floor(x);
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}

export function hash(index: number, channel: number): number {
  let x = (index + 1) * 0x9e3779b1 ^ (channel + 1) * 0x85ebca6b;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15; x = Math.imul(x, 0x846ca68b);
  return ((x ^ x >>> 16) >>> 0) / 0x100000000;
}
