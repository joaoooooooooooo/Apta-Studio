import { socialTheme } from './theme';

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: number, tracking = socialTheme.tracking) {
  ctx.font = weight + ' ' + size + 'px "' + socialTheme.fontFamily + '"';
  ctx.letterSpacing = size * tracking + 'px';
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width <= width) { line = next; continue; }
      if (line) { lines.push(line); line = ''; }
      // Break oversized words without clipping user text.
      for (const char of Array.from(word)) {
        if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Text is authored in a Figma line box; fit longer edits inside that box.
export function textBox(ctx: CanvasRenderingContext2D, text: string, box: {
  x: number; y: number; width: number; height: number; size: number; weight: number; lineHeight: number; align?: 'left' | 'center' | 'right'; tracking?: number;
}) {
  let size = box.size;
  let lines: string[] = [];
  let lineHeight = box.lineHeight;
  const measure = (candidate: number) => {
    setFont(ctx, candidate, box.weight, box.tracking);
    return wrapText(ctx, text, box.width);
  };
  lines = measure(size);
  if (lines.length * lineHeight > box.height) {
    // Find the largest fitting size so increasing a slider never makes text smaller.
    let low = 0.1, high = size;
    for (let attempt = 0; attempt < 18; attempt++) {
      const candidate = (low + high) / 2;
      const candidateLines = measure(candidate);
      if (candidateLines.length * box.lineHeight * candidate / box.size <= box.height) low = candidate;
      else high = candidate;
    }
    size = low;
    lineHeight = box.lineHeight * size / box.size;
    lines = measure(size);
  }
  ctx.textBaseline = 'alphabetic';
  // Match CSS normal line-height using the loaded font's ascent/descent.
  const metrics = ctx.measureText('Hg');
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  const baseline = (lineHeight - ascent - descent) / 2 + ascent;
  ctx.textAlign = box.align ?? 'left';
  const x = box.align === 'center' ? box.x + box.width / 2 : box.align === 'right' ? box.x + box.width : box.x;
  lines.forEach((line, i) => ctx.fillText(line, x, box.y + baseline + i * lineHeight));
  return lines.length * lineHeight;
}
