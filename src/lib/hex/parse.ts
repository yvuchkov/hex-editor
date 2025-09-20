export type DetectedFormat = {
  format: 'xxd' | 'hexdump' | 'raw-binary' | 'plain-hex' | 'unknown';
  mime?: string;
  extension?: string;
  suggestedName?: string;
  errors?: string[];
};

export type HexParseResult = {
  bytes: Uint8Array;
  detected?: DetectedFormat;
};

const HEX_BYTE = /\b[0-9a-fA-F]{2}\b/g;

function isLikelyText(data: ArrayBuffer): boolean {
  const bytes = new Uint8Array(data);
  let controlCount = 0;
  const sample = Math.min(bytes.length, 4096);
  for (let i = 0; i < sample; i++) {
    const b = bytes[i];
    if (b === 9 || b === 10 || b === 13) continue; // whitespace
    if (b < 32 || b === 127) controlCount++;
  }
  return controlCount < sample * 0.02;
}

function parsePlainHex(text: string): HexParseResult | null {
  const hexes = text.match(HEX_BYTE);
  if (!hexes || hexes.length < 1) return null;
  const bytes = new Uint8Array(hexes.length);
  for (let i = 0; i < hexes.length; i++) {
    bytes[i] = parseInt(hexes[i], 16);
  }
  const detected: DetectedFormat = { format: 'plain-hex', errors: [] };
  // basic validation: odd-length hex chunks (unlikely with our matcher, but check overall content)
  const compact = text.replace(/\s+/g, '');
  if (/^[0-9a-fA-F]+$/.test(compact) && compact.length % 2 === 1) {
    detected.errors!.push('Odd-length hex stream detected');
  }
  return { bytes, detected };
}

function parseXXD(text: string): HexParseResult | null {
  // xxd format: "00000000: 00 11 22 33  44 55 66 77  88 99 aa bb  cc dd ee ff  |..3.Ufw....|"
  const lines = text.split(/\r?\n/);
  let totalBytes: number[] = [];
  let matched = 0;
  let malformed = 0;
  for (const line of lines) {
    const m = line.match(/^\s*([0-9a-fA-F]{1,8}):\s+([0-9a-fA-F\s]+)(?:\s{2,}\|.*\|)?/);
    if (m) {
      matched++;
      const bytesPart = m[2].trim();
      const hexes = bytesPart.match(HEX_BYTE) ?? [];
      for (const h of hexes) totalBytes.push(parseInt(h, 16));
      // check if there are non-hex tokens in bytesPart (basic validation)
      const cleaned = bytesPart.replace(HEX_BYTE, '').replace(/\s+/g, '');
      if (cleaned.length > 0) malformed++;
    }
  }
  if (matched === 0 || totalBytes.length === 0) return null;
  const detected: DetectedFormat = { format: 'xxd' };
  if (malformed > 0) detected.errors = [`${malformed} line(s) contained non-hex tokens`];
  return { bytes: new Uint8Array(totalBytes), detected };
}

function parseHexdump(text: string): HexParseResult | null {
  // hexdump -C format: "00000000  00 11 22 |...|" (ASCII gutter often between '|')
  const lines = text.split(/\r?\n/);
  let total: number[] = [];
  let matched = 0;
  let malformed = 0;
  for (const line of lines) {
    const m = line.match(/^\s*([0-9a-fA-F]{1,8})\s+((?:[0-9a-fA-F]{2}\s+){1,16})(?:\s*\|.*\|)?/);
    if (m) {
      matched++;
      const hexes = m[2].match(HEX_BYTE) ?? [];
      for (const h of hexes) total.push(parseInt(h, 16));
      const cleaned = m[2].replace(HEX_BYTE, '').replace(/\s+/g, '');
      if (cleaned.length > 0) malformed++;
    }
  }
  if (matched === 0 || total.length === 0) return null;
  const detected: DetectedFormat = { format: 'hexdump' };
  if (malformed > 0) detected.errors = [`${malformed} line(s) contained non-hex tokens`];
  return { bytes: new Uint8Array(total), detected };
}

export function autodetectAndParse(input: string | ArrayBuffer): HexParseResult {
  if (typeof input !== 'string') {
    // If buffer looks like text, try textual parsers; else treat as raw binary
    if (isLikelyText(input)) {
      const text = new TextDecoder().decode(input);
      return autodetectAndParse(text);
    }
    const bytes = new Uint8Array(input);
    const fileInfo = detectFileSignature(bytes);
    return {
      bytes,
      detected: {
        format: 'raw-binary',
        ...fileInfo,
        suggestedName: fileInfo?.extension ? `reconstructed.${fileInfo.extension}` : 'reconstructed.bin',
      },
    };
  }
  const text = input;
  // Try xxd
  const xxd = parseXXD(text);
  if (xxd) return xxd;
  // Try hexdump -C
  const hd = parseHexdump(text);
  if (hd) return hd;
  // Try plain hex stream
  const plain = parsePlainHex(text);
  if (plain) return plain;
  // Fallback: as UTF-8 string bytes
  const bytes = new TextEncoder().encode(text);
  return { bytes, detected: { format: 'unknown', errors: ['Unable to match a known hex dump format'] } };
}

type FormatOptions = {
  bytesPerRow?: number;
  highlight?: string;
};

function indexOfSubarray(haystack: Uint8Array, needle: Uint8Array): number[] {
  if (needle.length === 0) return [];
  const results: number[] = [];
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    results.push(i);
  }
  return results;
}

export function formatHexView(bytes: Uint8Array, options: FormatOptions = {}): string {
  const perRow = options.bytesPerRow ?? 16;
  let highlightHexIndices = new Set<number>();
  if (options.highlight && options.highlight.length > 0) {
    const q = options.highlight.trim();
    const asHex = q.match(/^(?:[0-9a-fA-F]{2}\s*)+$/) ? q.replace(/\s+/g, '') : null;
    if (asHex) {
      const needle = new Uint8Array(asHex.match(/../g)!.map(h => parseInt(h, 16)));
      for (const idx of indexOfSubarray(bytes, needle)) {
        for (let k = 0; k < needle.length; k++) highlightHexIndices.add(idx + k);
      }
    } else {
      const needle = new TextEncoder().encode(q);
      for (const idx of indexOfSubarray(bytes, needle)) {
        for (let k = 0; k < needle.length; k++) highlightHexIndices.add(idx + k);
      }
    }
  }

  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += perRow) {
    const row = bytes.slice(i, i + perRow);
    const offset = i.toString(16).padStart(8, '0');
    const hexParts: string[] = [];
    const asciiParts: string[] = [];
    for (let j = 0; j < row.length; j++) {
      const b = row[j];
      const hex = b.toString(16).padStart(2, '0');
      const idx = i + j;
      const marked = highlightHexIndices.has(idx);
      hexParts.push(marked ? hex.toUpperCase() : hex);
      asciiParts.push(b >= 32 && b <= 126 ? String.fromCharCode(b) : '.');
    }
    const hexPadded = hexParts.join(' ').padEnd(perRow * 3 - 1, ' ');
    const ascii = asciiParts.join('');
    lines.push(`${offset}  ${hexPadded}  |${ascii}|`);
  }
  return lines.join('\n');
}

export function countSearchMatches(bytes: Uint8Array, query: string): number {
  if (!query) return 0;
  const q = query.trim();
  const asHex = q.match(/^(?:[0-9a-fA-F]{2}\s*)+$/) ? q.replace(/\s+/g, '') : null;
  if (asHex) {
    const needle = new Uint8Array(asHex.match(/../g)!.map(h => parseInt(h, 16)));
    return indexOfSubarray(bytes, needle).length;
  }
  const needle = new TextEncoder().encode(q);
  return indexOfSubarray(bytes, needle).length;
}

export function computeHighlightIndices(bytes: Uint8Array, query: string): Set<number> {
  const indices = new Set<number>();
  if (!query) return indices;
  const q = query.trim();
  const asHex = q.match(/^(?:[0-9a-fA-F]{2}\s*)+$/) ? q.replace(/\s+/g, '') : null;
  if (asHex) {
    const needle = new Uint8Array(asHex.match(/../g)!.map(h => parseInt(h, 16)));
    for (const idx of indexOfSubarray(bytes, needle)) {
      for (let k = 0; k < needle.length; k++) indices.add(idx + k);
    }
    return indices;
  }
  const needle = new TextEncoder().encode(q);
  for (const idx of indexOfSubarray(bytes, needle)) {
    for (let k = 0; k < needle.length; k++) indices.add(idx + k);
  }
  return indices;
}

export function computeDiffIndices(a: Uint8Array, b: Uint8Array): Set<number> {
  const set = new Set<number>();
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const av = i < a.length ? a[i] : undefined;
    const bv = i < b.length ? b[i] : undefined;
    if (av !== bv) set.add(i);
  }
  return set;
}

export type ExtractedString = { offset: number; text: string };

export function extractPrintableStrings(bytes: Uint8Array, minLength: number = 4): ExtractedString[] {
    const results: ExtractedString[] = [];
    let start = -1;
    for (let i = 0; i <= bytes.length; i++) {
        const b = i < bytes.length ? bytes[i] : 0; // sentinel
        const printable = b >= 32 && b <= 126; // ASCII printable
        if (printable) {
            if (start === -1) start = i;
        } else {
            if (start !== -1) {
                const len = i - start;
                if (len >= minLength) {
                    const text = String.fromCharCode(...bytes.slice(start, i));
                    results.push({ offset: start, text });
                }
                start = -1;
            }
        }
    }
    return results;
}

export function extractUtf16leStrings(bytes: Uint8Array, minLength: number = 4): ExtractedString[] {
    const results: ExtractedString[] = [];
    let start = -1;
    let count = 0;
    for (let i = 0; i <= bytes.length; i += 2) {
        const hasPair = i + 1 < bytes.length;
        const code = hasPair ? (bytes[i] | (bytes[i + 1] << 8)) : 0;
        const printable = hasPair && code >= 32 && code <= 126; // basic ASCII range in UTF-16LE
        if (printable) {
            if (start === -1) start = i;
            count++;
        } else {
            if (start !== -1) {
                if (count >= minLength) {
                    // Decode that slice via TextDecoder for correctness
                    const slice = bytes.slice(start, start + count * 2);
                    const text = new TextDecoder('utf-16le').decode(slice);
                    results.push({ offset: start, text });
                }
                start = -1;
                count = 0;
            }
        }
    }
    return results;
}

function detectFileSignature(bytes: Uint8Array): { mime?: string; extension?: string } | undefined {
  const startsWith = (...sig: number[]) => sig.every((v, i) => bytes[i] === v);
  const view4 = (o: number) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);

  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: 'image/png', extension: 'png' };
  if (startsWith(0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', extension: 'jpg' };
  if (startsWith(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) || startsWith(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)) return { mime: 'image/gif', extension: 'gif' };
  if (startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) return { mime: 'application/pdf', extension: 'pdf' };
  if (startsWith(0x50, 0x4b, 0x03, 0x04) || startsWith(0x50, 0x4b, 0x05, 0x06) || startsWith(0x50, 0x4b, 0x07, 0x08)) return { mime: 'application/zip', extension: 'zip' };
  if (startsWith(0x1f, 0x8b)) return { mime: 'application/gzip', extension: 'gz' };
  if (startsWith(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07)) return { mime: 'application/x-rar-compressed', extension: 'rar' };
  if (startsWith(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)) return { mime: 'application/x-7z-compressed', extension: '7z' };
  if (startsWith(0x7f, 0x45, 0x4c, 0x46)) return { mime: 'application/x-elf', extension: 'elf' };
  if (startsWith(0x4d, 0x5a)) return { mime: 'application/vnd.microsoft.portable-executable', extension: 'exe' };
  if (view4(0) === 'RIFF' && view4(8) === 'WAVE') return { mime: 'audio/wav', extension: 'wav' };
  if (view4(4) === 'ftyp') return { mime: 'video/mp4', extension: 'mp4' };
  if (view4(0) === 'OggS') return { mime: 'application/ogg', extension: 'ogg' };
  if (startsWith(0x42, 0x4d)) return { mime: 'image/bmp', extension: 'bmp' };
  if (startsWith(0x00, 0x00, 0x01, 0x00)) return { mime: 'image/x-icon', extension: 'ico' };
  if (view4(0) === 'RIFF' && view4(8) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  if (startsWith(0x53, 0x51, 0x4c, 0x69, 0x74, 0x65)) return { mime: 'application/vnd.sqlite3', extension: 'sqlite' };
  return undefined;
}

