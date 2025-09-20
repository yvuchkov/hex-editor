import { useEffect, useMemo, useRef, useState } from 'react';
import { computeHighlightIndices } from '@/lib/hex/parse';

export type HexEditorProps = {
	bytes: Uint8Array;
	onChange: (next: Uint8Array) => void;
	bytesPerRow?: number;
	query?: string;
	diffIndices?: Set<number> | null;
};

type EditMode = 'hex' | 'ascii';

function clampToByte(value: number): number { return Math.max(0, Math.min(255, value|0)); }

function isPrintableAscii(code: number): boolean { return code >= 32 && code <= 126; }

export default function HexEditor({ bytes, onChange, bytesPerRow = 16, query = '' , diffIndices = null}: HexEditorProps) {
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editMode, setEditMode] = useState<EditMode | null>(null);
	const [editBuffer, setEditBuffer] = useState<string>('');
	const highlights = useMemo(() => computeHighlightIndices(bytes, query), [bytes, query]);
	const tableRef = useRef<HTMLTableElement>(null);

	useEffect(() => { setEditingIndex(null); setEditMode(null); setEditBuffer(''); }, [bytes]);

	function commitEdit() {
		if (editingIndex == null || !editMode) return;
		const next = new Uint8Array(bytes);
		if (editMode === 'hex') {
			const text = editBuffer.trim();
			if (!/^[0-9a-fA-F]{1,2}$/.test(text)) { setEditingIndex(null); setEditMode(null); setEditBuffer(''); return; }
			const val = parseInt(text.padStart(2, '0'), 16);
			next[editingIndex] = clampToByte(val);
		} else {
			const ch = editBuffer.length > 0 ? editBuffer[0] : null;
			if (ch == null) { setEditingIndex(null); setEditMode(null); setEditBuffer(''); return; }
			next[editingIndex] = clampToByte(ch.charCodeAt(0));
		}
		onChange(next);
		setEditingIndex(null);
		setEditMode(null);
		setEditBuffer('');
	}

	function startHexEdit(idx: number) {
		setEditingIndex(idx);
		setEditMode('hex');
		setEditBuffer(bytes[idx].toString(16).padStart(2, '0'));
	}

	function startAsciiEdit(idx: number) {
		setEditingIndex(idx);
		setEditMode('ascii');
		const b = bytes[idx];
		setEditBuffer(isPrintableAscii(b) ? String.fromCharCode(b) : '');
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (editingIndex == null) return;
		if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
		if (e.key === 'Escape') { e.preventDefault(); setEditingIndex(null); setEditMode(null); setEditBuffer(''); }
	}

	const rows: JSX.Element[] = [];
	for (let offset = 0; offset < bytes.length; offset += bytesPerRow) {
		const rowBytes = bytes.slice(offset, offset + bytesPerRow);
		rows.push(
			<tr key={offset} className="hover:bg-white/[0.06] odd:bg-white/[0.02]">
				<td className="sticky left-0 bg-surface/80 backdrop-blur font-mono text-subtle pr-2 whitespace-nowrap">{offset.toString(16).padStart(8, '0')}</td>
				{Array.from({ length: bytesPerRow }).map((_, i) => {
					const idx = offset + i;
					const b = rowBytes[i];
					const exists = idx < bytes.length;
					const isEditing = editingIndex === idx && editMode === 'hex';
					const isHighlight = highlights.has(idx);
					const isDiff = diffIndices ? diffIndices.has(idx) : false;
					return (
						<td key={i} className={`font-mono text-sm text-center align-middle w-10 h-9 rounded transition-colors ${exists ? 'cursor-text' : 'opacity-30'} ${isHighlight ? 'bg-primary/30 text-white' : ''} ${isDiff ? 'ring-1 ring-rose-400/70' : ''}`}
							onClick={() => exists && startHexEdit(idx)}
						>
							{exists ? (
								isEditing ? (
									<input
										autoFocus
										value={editBuffer}
										onChange={(e) => setEditBuffer(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 2))}
										onBlur={commitEdit}
										onKeyDown={handleKeyDown}
										className="w-10 text-center bg-black/40 border border-white/20 rounded outline-none focus:ring-1 focus:ring-primary"
									/>
								) : (
									<span className="inline-block px-1 py-0.5 rounded hover:bg-white/10 focus:bg-white/10 focus:outline-none">
										{b.toString(16).padStart(2, '0')}
									</span>
								)
							) : null}
						</td>
					);
				})}
				<td className="font-mono text-sm pl-3 whitespace-pre">
					{Array.from(rowBytes).map((b, i) => {
						const idx = offset + i;
						const exists = idx < bytes.length;
						const isEditingAscii = editingIndex === idx && editMode === 'ascii';
						const isDiff = diffIndices ? diffIndices.has(idx) : false;
						return (
							<span key={i} className={`inline-block w-3 text-center mr-0.5 rounded ${exists ? 'cursor-text' : 'opacity-30'} ${isDiff ? 'bg-rose-400/30' : ''}`} onClick={() => exists && startAsciiEdit(idx)}>
								{exists ? (
									isEditingAscii ? (
										<input
											autoFocus
											value={editBuffer}
											onChange={(e) => setEditBuffer(e.target.value.slice(0, 1))}
											onBlur={commitEdit}
											onKeyDown={handleKeyDown}
											className="w-3 bg-black/40 border border-white/20 rounded outline-none focus:ring-1 focus:ring-primary text-center"
										/>
									) : (
										<span className="px-0.5 py-0.5 hover:bg-white/10 rounded">{isPrintableAscii(b) ? String.fromCharCode(b) : '.'}</span>
									)
								) : null}
							</span>
						);
					})}
				</td>
			</tr>
		);
	}

	return (
		<div className="surface overflow-auto max-h-[70vh]">
			<table ref={tableRef} className="w-full border-collapse">
				<thead className="sticky top-0 z-10 bg-surface/80 backdrop-blur">
					<tr>
						<th className="text-left px-2 py-2 font-medium text-subtle">Offset</th>
						{Array.from({ length: bytesPerRow }).map((_, i) => (
							<th key={i} className="text-center px-1 py-2 font-medium text-subtle">{i.toString(16).padStart(2, '0')}</th>
						))}
						<th className="text-left px-3 py-2 font-medium text-subtle">ASCII</th>
					</tr>
				</thead>
				<tbody>
					{rows}
				</tbody>
			</table>
		</div>
	);
}
