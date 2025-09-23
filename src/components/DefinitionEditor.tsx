"use client";

import { useMemo } from 'react';
import { ECUDefinition, ScalarDef, Table2DDef } from '@/lib/ecu/types';
import { readScalar, writeScalar, readTable2D, writeTable2D } from '@/lib/ecu/io';

export function DefinitionEditor({ bytes, def, onChange }:{ bytes: Uint8Array; def: ECUDefinition; onChange: (next: Uint8Array) => void; }) {
  const scalars = def.scalars ?? [];
  const tables2d = def.tables2d ?? [];

  const scalarValues = useMemo(() => scalars.map(s => ({ s, v: readScalar(bytes, s) })), [bytes, scalars]);
  const tableValues = useMemo(() => tables2d.map(t => ({ t, v: readTable2D(bytes, t) })), [bytes, tables2d]);

  function updateScalar(s: ScalarDef, nextPhysical: number) {
    const clone = new Uint8Array(bytes);
    writeScalar(clone, s, nextPhysical);
    onChange(clone);
  }

  function updateCell(t: Table2DDef, r: number, c: number, nextPhysical: number) {
    const clone = new Uint8Array(bytes);
    const current = readTable2D(clone, t);
    current[r][c] = nextPhysical;
    writeTable2D(clone, t, current);
    onChange(clone);
  }

  return (
    <div className="space-y-6">
      {scalarValues.length > 0 && (
        <section className="surface p-4">
          <h2 className="h1 mb-3">Scalars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {scalarValues.map(({ s, v }) => (
              <label key={s.id} className="flex flex-col gap-1">
                <span className="text-sm subtle">{s.name}{s.unit ? ` (${s.unit})` : ''}</span>
                <input type="number" defaultValue={Number(v.toFixed(4))} onChange={e => updateScalar(s, Number(e.target.value))} className="bg-surface border border-white/10 rounded px-2 py-1"/>
              </label>
            ))}
          </div>
        </section>
      )}

      {tableValues.length > 0 && (
        <section className="surface p-4">
          <h2 className="h1 mb-3">Tables</h2>
          <div className="space-y-6">
            {tableValues.map(({ t, v }) => (
              <div key={t.id} className="space-y-2">
                <div className="subtle text-sm">{t.name}{t.unit ? ` (${t.unit})` : ''} – {t.rows}x{t.cols}</div>
                <div className="overflow-auto">
                  <table className="border-collapse">
                    <tbody>
                      {v.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c} className="p-0.5">
                              <input type="number" defaultValue={Number(cell.toFixed(4))} onChange={e => updateCell(t, r, c, Number(e.target.value))} className="w-20 bg-black/40 border border-white/20 rounded px-1 py-0.5"/>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default DefinitionEditor;


