export function hasTemplateText(values: Record<string, any>): boolean {
  return values.overlayTextEnabled === 'On' && !!String(values.overlayText ?? '').trim();
}

export function drawTemplateText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  values: Record<string, any>,
  scale = 1,
) {
  if (!hasTemplateText(values)) return;
  const size = Math.max(12, Math.min(240, Number(values.overlayTextSize ?? 72)));
  const x = Math.max(0, Math.min(100, Number(values.overlayTextX ?? 50))) / 100 * width;
  const y = Math.max(0, Math.min(100, Number(values.overlayTextY ?? 50))) / 100 * height;
  const align = values.overlayTextAlign === 'Left' ? 'left' : values.overlayTextAlign === 'Right' ? 'right' : 'center';
  const boxWidth = width * 0.8;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.font = `600 ${size}px "Inter Tight", Arial, sans-serif`;
  ctx.fillStyle = String(values.overlayTextColor ?? '#191919');
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const lines: string[] = [];
  for (const paragraph of String(values.overlayText).split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > boxWidth) { lines.push(line); line = word; }
      else line = candidate;
    }
    lines.push(line);
  }
  const lineHeight = size * 1.18;
  const tx = align === 'left' ? x - boxWidth / 2 : align === 'right' ? x + boxWidth / 2 : x;
  lines.forEach((line, i) => ctx.fillText(line, tx, y + (i - (lines.length - 1) / 2) * lineHeight, boxWidth));
  ctx.restore();
}
