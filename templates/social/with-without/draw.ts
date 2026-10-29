import type { SocialArtwork, SocialImages, SocialValues } from '../types';
import { textBox, wrapText } from '../canvas';

const root = '/social/with-without/assets/';
const icons = ['user-check', 'users-four', 'counterclockwise', 'calendar-x', 'clock-user', 'calendar-slash'] as const;
type Icon = (typeof icons)[number];
type Card = { x: number; y: number; width: number; height: number; textX: number; textWidth: number; key: string; icon: Icon; angle?: number };

const cards: Card[] = [
  { x: 281.47, y: 221, width: 630, height: 141, textX: 433.97, textWidth: 437.48, key: 'withOne', icon: 'user-check' },
  { x: 281, y: 349, width: 544, height: 151.302, textX: 437.87, textWidth: 347.05, key: 'withTwo', icon: 'users-four' },
  { x: 281, y: 491, width: 580, height: 139.313, textX: 437.73, textWidth: 383.4, key: 'withThree', icon: 'counterclockwise' },
  { x: 279, y: 698, width: 522, height: 155, textX: 437.27, textWidth: 324, key: 'withoutOne', icon: 'calendar-x' },
  { x: 204, y: 856, width: 675, height: 119.7, textX: 365.71, textWidth: 473.32, key: 'withoutTwo', icon: 'clock-user', angle: -2.58 },
  { x: 271, y: 983, width: 551, height: 135.587, textX: 430.99, textWidth: 350.86, key: 'withoutThree', icon: 'calendar-slash', angle: 1.27 },
];

function drawCard(ctx: CanvasRenderingContext2D, values: SocialValues, images: SocialImages, card: Card) {
  ctx.save();
  if (card.angle) {
    ctx.translate(card.x + card.width / 2, card.y + card.height / 2);
    ctx.rotate(card.angle * Math.PI / 180);
    ctx.translate(-card.width / 2, -card.height / 2);
  } else ctx.translate(card.x, card.y);

  ctx.shadowColor = '#1f1f1f';
  ctx.shadowBlur = 18.749;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = '#303030';
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, card.width, card.height, 25);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();

  // The Figma SVGs include their own filter bounds. Draw at native size so
  // their paths and soft shadows occupy the same slot as the design.
  const icon = images[card.icon];
  ctx.drawImage(icon, -46, (card.height - icon.naturalHeight) / 2);

  const text = String(values[card.key] ?? '');
  const size = 35;
  const lineHeight = 39.55;
  ctx.font = `${size}px "Inter Tight"`;
  ctx.letterSpacing = '0px';
  const lines = wrapText(ctx, text, card.textWidth);
  const textHeight = Math.min(lines.length * lineHeight, card.height - 20);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  textBox(ctx, text, { x: card.textX - card.x, y: (card.height - textHeight) / 2, width: card.textWidth, height: card.height - 20, size, weight: 400, lineHeight, tracking: 0 });
  ctx.restore();
}

export const withWithoutArtwork: SocialArtwork = {
  width: 1080, height: 1350, fonts: true,
  background: () => '#1b1b1b',
  images: () => Object.fromEntries([
    ...icons.map(icon => [icon, root + icon + '.svg']),
    ['arrow-with', root + 'arrow-with.svg'],
    ['arrow-without', root + 'arrow-without.svg'],
    ['logo-with', root + 'logo-with.svg'],
    ['logo-without', root + 'logo-without.svg'],
  ]),
  draw(ctx, values, images) {
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(0, 0, 1080, 1350);

    ctx.save();
    ctx.translate(249, 178);
    ctx.scale(-1, 1);
    ctx.drawImage(images['arrow-with'], 0, 0);
    ctx.restore();

    cards.forEach(card => drawCard(ctx, values, images, card));

    ctx.save();
    ctx.translate(929, 1092);
    ctx.rotate(25.97 * Math.PI / 180);
    ctx.scale(1, -1);
    ctx.drawImage(images['arrow-without'], -41, -93);
    ctx.restore();

    ctx.save();
    ctx.translate(69, 112.5);
    ctx.rotate(-3.13 * Math.PI / 180);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 60.778px "Inter Tight"';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '0px';
    ctx.fillText(String(values.withLabel ?? 'With'), 0, 0);
    ctx.restore();
    ctx.drawImage(images['logo-with'], 217, 90);

    ctx.save();
    ctx.translate(721.67, 1195.22);
    ctx.rotate(-5.99 * Math.PI / 180);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 60.778px "Inter Tight"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '0px';
    ctx.fillText(String(values.withoutLabel ?? 'Without'), 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(719.8, 1254.7);
    ctx.rotate(-4.43 * Math.PI / 180);
    ctx.drawImage(images['logo-without'], -54.5, -26.71);
    ctx.restore();
  },
};
