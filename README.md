# Hex Editor

Hex dump viewer, editor, and binary rebuilder.

Features:

- Upload any file (binary or textual hex dump) — no auto-load
- Compare mode: load File A and File B and highlight differences
- Autodetect xxd, hexdump -C, plain hex, or raw binary
- Clean table view with sticky header, zebra rows, hover effects
- Inline editing: hex cells and ASCII gutter
- Search (ASCII or hex), bytes-per-row control
- Metadata (format, MIME/extension, size)
- Download reconstructed or edited binary (A and B separately)

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal.

Node version note: use Node 20 LTS (>=18.17 and <21). Some Node 22 builds can trigger transient webpack chunk reload errors in dev.

## Usage

- Click Open File A to load your first file. Toggle Compare to enable Open File B and side-by-side diff view.
- Click any hex cell to edit the byte in hex; click any ASCII character to edit as text.
- Use the search box for ASCII text or hex sequences like `aa bb cc`.
- Download buttons save the edited bytes of A or B.

## Notes

- Parsers ignore malformed tokens and surface warnings.
- File-type detection uses common signatures (e.g., PNG, ZIP).

