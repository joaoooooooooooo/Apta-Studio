'use client';

import type { ControlDef } from '@/lib/types';
import type { EasingSpec } from '@/lib/easing';
import { ControlRow } from './Controls';
import EasingCurveEditor from './EasingCurveEditor';

const groups = [
  { title: 'Opening text', keys: ['openingPhrase', 'typeScale', 'wordGap', 'letterSpacing', 'lineSpacing', 'openingDuration', 'wordStagger'], curve: 'openingCurve', curveLabel: 'Entrance curve' },
  { title: 'Stacked text', keys: ['stackPhrase', 'stackGap', 'stackDuration'] },
  { title: 'Handoff', keys: ['openingExitLead', 'stackEntryLead', 'stackEntryDuration', 'shutterLag'], curve: 'handoffCurve', curveLabel: 'Transition curve' },
  { title: 'Colors', keys: ['paperColor', 'skyColor'] },
] as const;

const curveDefaults: Record<string, EasingSpec> = {
  openingCurve: { id: 'custom', bezier: [0.22, 0, 0.2, 1] },
  handoffCurve: { id: 'custom', bezier: [0.8, 0, 0.2, 1] },
};

export default function ShutterTypeControls({ controls, values, setValue }: {
  controls: ControlDef[];
  values: Record<string, any>;
  setValue: (key: string, value: any) => void;
}) {
  return <>
    {groups.map(group => <div className="ctl-section" key={group.title}>
      <div className="ctl-section-title">{group.title}</div>
      {group.keys.map(key => {
        const def = controls.find(control => control.key === key);
        return def ? <ControlRow key={key} def={def} value={values[key] ?? def.default} onChange={value => setValue(key, value)} /> : null;
      })}
      {'curve' in group && group.curve && <div className="match-cut-curve">
        <span className="eyebrow">{group.curveLabel}</span>
        <EasingCurveEditor spec={(values[group.curve] as EasingSpec | undefined) ?? curveDefaults[group.curve]} onChange={curve => setValue(group.curve, curve)} />
      </div>}
    </div>)}
  </>;
}
