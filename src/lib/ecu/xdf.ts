import { ECUDefinition, ScalarDef, Table2DDef } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function xdfToDefinition(xml: any): ECUDefinition {
  const xdf = xml?.XDFFORMAT;
  if (!xdf) {
    throw new Error('Invalid XDF format: missing XDFFORMAT root element');
  }

  const header = xdf.XDFHEADER;
  const name = header?.deftitle || header?.['@_deftitle'] || 'Unnamed Definition';
  const description = header?.description || header?.['@_description'];

  const scalars: ScalarDef[] = [];
  const tables2d: Table2DDef[] = [];

  // Parse XDFCONSTANT elements (scalars)
  const constants = Array.isArray(xdf.XDFCONSTANT) ? xdf.XDFCONSTANT : xdf.XDFCONSTANT ? [xdf.XDFCONSTANT] : [];
  for (const c of constants) {
    const id = c['@_uniqueid'] || c['@_id'] || `scalar_${scalars.length}`;
    const title = c.title || c['@_title'] || id;
    const address = parseAddress(c.address || c['@_address']);
    const flags = c['@_flags'] || c.flags || '0x0';
    const dataType = parseDataType(flags);
    const endian = parseEndian(flags);
    const math = c.MATH || c.math;
    const { factor, offset } = parseMath(math);
    const unit = c.units || c['@_units'];

    scalars.push({
      id,
      name: title,
      address,
      length: getBytesForType(dataType),
      dataType,
      endian,
      factor,
      offset,
      unit,
    });
  }

  // Parse XDFTABLE elements (2D tables)
  const tables = Array.isArray(xdf.XDFTABLE) ? xdf.XDFTABLE : xdf.XDFTABLE ? [xdf.XDFTABLE] : [];
  for (const t of tables) {
    const id = t['@_uniqueid'] || t['@_id'] || `table_${tables2d.length}`;
    const title = t.title || t['@_title'] || id;
    const address = parseAddress(t.address || t['@_address']);
    const flags = t['@_flags'] || t.flags || '0x0';
    const dataType = parseDataType(flags);
    const endian = parseEndian(flags);
    const rows = parseInt(t.XDFROWS?.['@_count'] || t['@_rows'] || '1', 10);
    const cols = parseInt(t.XDFCOLS?.['@_count'] || t['@_cols'] || '1', 10);
    const math = t.MATH || t.math;
    const { factor, offset } = parseMath(math);
    const unit = t.units || t['@_units'];

    tables2d.push({
      id,
      name: title,
      address,
      rows,
      cols,
      dataType,
      endian,
      factor,
      offset,
      unit,
    });
  }

  return { name, description, scalars, tables2d };
}

function parseAddress(addr: any): number {
  if (typeof addr === 'number') return addr;
  if (typeof addr === 'string') {
    if (addr.startsWith('0x')) return parseInt(addr, 16);
    return parseInt(addr, 10);
  }
  if (addr?.['@_value']) return parseAddress(addr['@_value']);
  return 0;
}

function parseDataType(flags: string): 'uint8' | 'uint16' | 'uint32' | 'int8' | 'int16' | 'int32' | 'float32' {
  const num = typeof flags === 'string' ? parseInt(flags, 16) : flags;
  const isSigned = (num & 0x01) !== 0;
  const size = (num >> 4) & 0x0F; // bits 4-7

  if (size === 0 || size === 1) return isSigned ? 'int8' : 'uint8';
  if (size === 2) return isSigned ? 'int16' : 'uint16';
  if (size === 4) return isSigned ? 'int32' : 'uint32';
  return 'uint8'; // default
}

function parseEndian(flags: string): 'little' | 'big' {
  const num = typeof flags === 'string' ? parseInt(flags, 16) : flags;
  return (num & 0x02) !== 0 ? 'big' : 'little';
}

function parseMath(math: any): { factor: number; offset: number } {
  let factor = 1;
  let offset = 0;

  if (!math) return { factor, offset };

  const eq = math.equation || math['@_equation'] || math.VAR?.['@_equation'];
  if (typeof eq === 'string') {
    // Simple linear equation parser: "X*factor+offset" or "X/divisor+offset"
    const mulMatch = eq.match(/X\s*\*\s*([\d.]+)/);
    const divMatch = eq.match(/X\s*\/\s*([\d.]+)/);
    const addMatch = eq.match(/[+-]\s*([\d.]+)/);

    if (mulMatch) factor = parseFloat(mulMatch[1]);
    if (divMatch) factor = 1 / parseFloat(divMatch[1]);
    if (addMatch) {
      const sign = eq.includes('-') ? -1 : 1;
      offset = sign * parseFloat(addMatch[1]);
    }
  }

  return { factor, offset };
}

function getBytesForType(dataType: string): number {
  switch (dataType) {
    case 'uint8':
    case 'int8':
      return 1;
    case 'uint16':
    case 'int16':
      return 2;
    case 'uint32':
    case 'int32':
    case 'float32':
      return 4;
    default:
      return 1;
  }
}
