import { ScalarDef, Table2DDef } from './types';

const BYTES_PER_TYPE: Record<string, number> = {
  uint8: 1,
  int8: 1,
  uint16: 2,
  int16: 2,
  uint32: 4,
  int32: 4,
  float32: 4,
};

function readValue(bytes: Uint8Array, address: number, dataType: string, endian: 'little' | 'big' = 'little'): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  const littleEndian = endian === 'little';

  switch (dataType) {
    case 'uint8':
      return view.getUint8(address);
    case 'int8':
      return view.getInt8(address);
    case 'uint16':
      return view.getUint16(address, littleEndian);
    case 'int16':
      return view.getInt16(address, littleEndian);
    case 'uint32':
      return view.getUint32(address, littleEndian);
    case 'int32':
      return view.getInt32(address, littleEndian);
    case 'float32':
      return view.getFloat32(address, littleEndian);
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

function writeValue(bytes: Uint8Array, address: number, value: number, dataType: string, endian: 'little' | 'big' = 'little'): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset);
  const littleEndian = endian === 'little';

  switch (dataType) {
    case 'uint8':
      view.setUint8(address, value);
      break;
    case 'int8':
      view.setInt8(address, value);
      break;
    case 'uint16':
      view.setUint16(address, value, littleEndian);
      break;
    case 'int16':
      view.setInt16(address, value, littleEndian);
      break;
    case 'uint32':
      view.setUint32(address, value, littleEndian);
      break;
    case 'int32':
      view.setInt32(address, value, littleEndian);
      break;
    case 'float32':
      view.setFloat32(address, value, littleEndian);
      break;
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}

export function readScalar(bytes: Uint8Array, def: ScalarDef): number {
  const raw = readValue(bytes, def.address, def.dataType, def.endian);
  const factor = def.factor ?? 1;
  const offset = def.offset ?? 0;
  return raw * factor + offset;
}

export function writeScalar(bytes: Uint8Array, def: ScalarDef, physicalValue: number): void {
  const factor = def.factor ?? 1;
  const offset = def.offset ?? 0;
  const raw = (physicalValue - offset) / factor;
  writeValue(bytes, def.address, raw, def.dataType, def.endian);
}

export function readTable2D(bytes: Uint8Array, def: Table2DDef): number[][] {
  const result: number[][] = [];
  const bytesPerValue = BYTES_PER_TYPE[def.dataType];
  const factor = def.factor ?? 1;
  const offset = def.offset ?? 0;

  for (let r = 0; r < def.rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < def.cols; c++) {
      const idx = r * def.cols + c;
      const address = def.address + idx * bytesPerValue;
      const raw = readValue(bytes, address, def.dataType, def.endian);
      row.push(raw * factor + offset);
    }
    result.push(row);
  }

  return result;
}

export function writeTable2D(bytes: Uint8Array, def: Table2DDef, physicalValues: number[][]): void {
  const bytesPerValue = BYTES_PER_TYPE[def.dataType];
  const factor = def.factor ?? 1;
  const offset = def.offset ?? 0;

  for (let r = 0; r < def.rows; r++) {
    for (let c = 0; c < def.cols; c++) {
      const idx = r * def.cols + c;
      const address = def.address + idx * bytesPerValue;
      const raw = (physicalValues[r][c] - offset) / factor;
      writeValue(bytes, address, raw, def.dataType, def.endian);
    }
  }
}
