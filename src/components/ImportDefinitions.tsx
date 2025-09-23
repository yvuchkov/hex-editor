"use client";

import { useRef } from 'react';
import { ECUDefinition } from '@/lib/ecu/types';
import { xdfToDefinition } from '@/lib/ecu/xdf';

export function ImportDefinitions({ onLoaded }:{ onLoaded: (def: ECUDefinition) => void; }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    const name = file.name.toLowerCase();
    try {
      if (name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        // trust shape as ECUDefinition
        onLoaded(parsed as ECUDefinition);
        return;
      }
      if (name.endsWith('.xdf')) {
        // Lazy import an XML parser to keep bundle small
        const { XMLParser } = await import('fast-xml-parser');
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
        const xml = parser.parse(text);
        const def = xdfToDefinition(xml);
        onLoaded(def);
        return;
      }
      throw new Error('Unsupported definition format. Use .xdf or .json');
    } catch (e: any) {
      alert('Failed to import definitions: ' + (e?.message || String(e)));
    }
  }

  function click() {
    const el = fileRef.current; if (!el) return; el.onchange = async (e: any) => { const f = e.target.files?.[0]; if (f) await handleFile(f); }; el.click();
  }

  return (
    <div>
      <input type="file" ref={fileRef} className="hidden" accept=".xdf,.json" />
      <button className="btn btn-ghost" onClick={click}>Import Definitions (.xdf or .json)</button>
    </div>
  );
}

export default ImportDefinitions;


