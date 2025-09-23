# Hex Editor

In-browser hex dump viewer, editor, and binary rebuilder. Everything runs client‑side—your files never leave your machine.

- **Live demo**: [hex-editor.vercel.app](https://hex-editor.vercel.app)

## Features

- **Open any file**: raw binaries or textual hex dumps
- **Compare A/B**: side-by-side with byte-level diff highlighting
- **Auto-detect formats**: `xxd`, `hexdump -C`, plain hex streams, raw binary
- **Inline editing**: edit bytes in the hex grid or the ASCII gutter
- **Search**: ASCII text or hex sequences like `aa bb cc`
- **Adjustable layout**: choose bytes-per-row; optimized for small screens
- **Metadata**: size, detected MIME/extension, suggested filename
- **Export**: download reconstructed or edited bytes for A and B
- **Privacy-first**: no uploads, no servers—pure browser processing

## Quick start (local)

```bash
npm install
npm run dev
```

Open the local URL printed in your terminal.

Node version note: use Node 20 LTS (>=18.17 and <21). Some Node 22 builds can trigger transient webpack chunk reload errors in dev.

## Usage

1. Click **Open File A** to select a file. Optionally enable **Compare** to open **File B**.
2. Click a hex cell to edit a byte in hex, or click a character in the ASCII gutter to edit as text.
3. Use the search box for ASCII text or hex sequences (e.g. `41 42 43`). Matches are highlighted and counted for A.
4. Adjust **Bytes/row** to change the grid width.
5. Click **Download A/B** to save the current bytes. Suggested names are provided for recognized formats.

Keyboard

- Press Enter to commit an in-place edit; Esc to cancel.

## Supported inputs and detection

- Textual hex dumps: `xxd` and `hexdump -C`
- Plain hex streams: `00 11 22 33 ...` (whitespace tolerated)
- Raw binary files: parsed directly; common signatures (PNG, ZIP, PDF, ELF, etc.) are detected to provide MIME/extension and a suggested filename

Notes

- Parsers are tolerant of minor formatting issues and surface warnings when lines contain non-hex tokens.
- On mobile screens the grid defaults to 8 bytes per row for readability.

## Build and deploy

```bash
npm run build
npm run start
```

This project is built with Next.js 14 and deploys cleanly to Vercel (the live demo is hosted there).

## Tech stack

- Next.js 14, React 18
- TypeScript
- Tailwind CSS for styling

## Privacy & security

- All parsing, viewing, editing, and downloads happen entirely in your browser.
- No data leaves your device and no files are uploaded to any server.

## Limitations

- Very large files can be memory-heavy in the browser. If you run into performance issues, try reducing bytes-per-row or working in smaller chunks.