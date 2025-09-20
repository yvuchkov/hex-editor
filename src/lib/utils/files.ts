export function downloadBytes(bytes: Uint8Array, filename: string) {
  // Ensure the Blob part is a real ArrayBuffer (not SharedArrayBuffer)
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatBytes(num: number): string {
  if (num < 1024) return `${num} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do {
    num /= 1024;
    i++;
  } while (num >= 1024 && i < units.length - 1);
  return `${num.toFixed(2)} ${units[i]}`;
}

