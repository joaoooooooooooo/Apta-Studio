'use client';

import { ControlRow } from './Controls';

export default function GalleryCaptionRows({ count, value, onChange }: {
  count: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const lines = String(value ?? '').split(/\r?\n/);
  const visibleCount = Math.max(1, Math.min(20, Math.round(Number(count) || 1)));

  const update = (index: number, text: string) => {
    const next = [...lines];
    next[index] = text.replace(/[\r\n]+/g, ' ');
    onChange(next.join('\n'));
  };

  return (
    <div className="ctl-section gallery-caption-rows">
      <div className="ctl-section-title">Card text ({visibleCount})</div>
      {Array.from({ length: visibleCount }, (_, index) => (
        <ControlRow
          key={index}
          def={{ key: `caption-${index}`, label: `Card ${index + 1}`, type: 'text', default: '' }}
          value={lines[index] ?? `Item ${index + 1}`}
          onChange={(text) => update(index, String(text))}
        />
      ))}
    </div>
  );
}
