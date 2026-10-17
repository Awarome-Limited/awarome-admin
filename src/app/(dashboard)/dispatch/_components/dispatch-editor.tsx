'use client';

import { useState } from 'react';
import { SettingsForm } from '@/components/settings-form';
import { Field, FieldGrid, Panel, SettingsLayout, SummaryRows } from '@/components/page';
import { BatchSizeGrid, type PerVehicleBatchSize } from './batch-size-grid';

export interface DispatchGroup {
  title: string;
  sub: string;
  fields: { label: string; name: string; unit: string; value: number; help?: string }[];
}

/** The fee the consequence panel prices against: a typical instant delivery. */
const SAMPLE_FEE = 2400;
const naira = (n: number) => `₦ ${Math.round(n).toLocaleString()}`;

export function DispatchEditor({
  groups,
  action,
  batch,
  overLimitRiders,
}: {
  groups: DispatchGroup[];
  action: (formData: FormData) => Promise<void>;
  batch: { minSize: PerVehicleBatchSize; maxSize: PerVehicleBatchSize; maxWaitMinutes: number };
  /** Riders over the saved debt limit right now; null when unknown. */
  overLimitRiders: number | null;
}) {
  const initialCommission = groups.flatMap((g) => g.fields).find((f) => f.name === 'riderCommissionPercent')?.value ?? 0;
  const initialDebt = groups.flatMap((g) => g.fields).find((f) => f.name === 'riderDebtThreshold')?.value ?? 0;
  const [commission, setCommission] = useState(initialCommission);
  const [debt, setDebt] = useState(initialDebt);

  const cut = (SAMPLE_FEE * commission) / 100;

  return (
    <SettingsForm
      action={action}
      label="Unsaved dispatch changes"
      successMessage="Dispatch rules saved"
      onChange={(form) => {
        const read = (name: string, fb: number) => {
          const v = Number((form.elements.namedItem(name) as HTMLInputElement | null)?.value);
          return Number.isFinite(v) ? v : fb;
        };
        setCommission(read('riderCommissionPercent', initialCommission));
        setDebt(read('riderDebtThreshold', initialDebt));
      }}
    >
      <SettingsLayout
        aside={
          <Panel title="What this means" description={`On a ${naira(SAMPLE_FEE)} delivery fee.`}>
            <SummaryRows
              rows={[
                { label: 'Rider is offered', value: naira(SAMPLE_FEE - cut) },
                { label: 'Awarome keeps', value: naira(cut) },
              ]}
            />
            <div className="rounded-[8px] bg-hi-soft px-3.5 py-3 text-[13px] leading-[1.5]">
              A rider who owes more than {naira(debt)} in commission can see jobs but can’t accept them.
              {overLimitRiders !== null && debt === initialDebt && (
                <>
                  {' '}
                  {overLimitRiders === 0
                    ? 'No rider is over the limit right now.'
                    : `${overLimitRiders} ${overLimitRiders === 1 ? 'rider is' : 'riders are'} over it right now.`}
                </>
              )}
            </div>
          </Panel>
        }
      >
        {groups.map((group) => (
          <Panel key={group.title} title={group.title} description={group.sub}>
            <FieldGrid>
              {group.fields.map((field) => (
                <Field key={field.name} label={field.label} htmlFor={field.name} help={field.help}>
                  <div className="field-wrap">
                    <span>{field.unit}</span>
                    <input
                      id={field.name}
                      name={field.name}
                      type="number"
                      step="any"
                      defaultValue={field.value}
                      className="w-full border-0 bg-transparent text-foreground tabular-nums outline-none"
                    />
                  </div>
                </Field>
              ))}
            </FieldGrid>
          </Panel>
        ))}

        <BatchSizeGrid minSize={batch.minSize} maxSize={batch.maxSize} maxWaitMinutes={batch.maxWaitMinutes} />
      </SettingsLayout>
    </SettingsForm>
  );
}
