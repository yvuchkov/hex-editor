export interface ScalarDef {
  id: string;
  name: string;
  address: number;
  length: number; // in bytes
  dataType: 'uint8' | 'uint16' | 'uint32' | 'int8' | 'int16' | 'int32' | 'float32';
  endian?: 'little' | 'big';
  factor?: number;
  offset?: number;
  unit?: string;
}

export interface Table2DDef {
  id: string;
  name: string;
  address: number;
  rows: number;
  cols: number;
  dataType: 'uint8' | 'uint16' | 'uint32' | 'int8' | 'int16' | 'int32' | 'float32';
  endian?: 'little' | 'big';
  factor?: number;
  offset?: number;
  unit?: string;
}

export interface ECUDefinition {
  name?: string;
  description?: string;
  scalars?: ScalarDef[];
  tables2d?: Table2DDef[];
}
