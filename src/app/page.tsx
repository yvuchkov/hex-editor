"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

import { autodetectAndParse, formatHexView, HexParseResult, countSearchMatches, computeDiffIndices } from '@/lib/hex/parse';
import { downloadBytes, formatBytes } from '@/lib/utils/files';
import HexEditor from '@/components/HexEditor';

export default function HomePage() {
	const [fileA, setFileA] = useState<HexParseResult | null>(null);
	const [fileB, setFileB] = useState<HexParseResult | null>(null);
	const [editedA, setEditedA] = useState<Uint8Array | null>(null);
	const [editedB, setEditedB] = useState<Uint8Array | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState<string>('');
	const [bytesPerRow, setBytesPerRow] = useState<number>(16);
	const [compare, setCompare] = useState<boolean>(false);
	const inputARef = useRef<HTMLInputElement>(null);
	const inputBRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (typeof window !== 'undefined' && window.innerWidth < 640) {
			setBytesPerRow(8);
		}
	}, []);

	async function handleOpenFile(ref: React.RefObject<HTMLInputElement>, setter: (r: HexParseResult) => void, editedSetter: (b: Uint8Array) => void) {
		const el = ref.current;
		if (!el) return;
		el.onchange = async (e: any) => {
			const f = e.target.files?.[0];
			if (!f) return;
			const buf = await f.arrayBuffer();
			try {
				const res = autodetectAndParse(buf);
				setter(res);
				editedSetter(res.bytes);
				setError(null);
			} catch (e: any) {
				setError(String(e?.message || e));
			}
		};
		el.click();
	}

	const activeA = editedA ?? fileA?.bytes ?? null;
	const activeB = editedB ?? fileB?.bytes ?? null;
	const viewA = useMemo(() => (activeA ? formatHexView(activeA, { highlight: query, bytesPerRow }) : null), [activeA, query, bytesPerRow]);
	const matchCountA = useMemo(() => (activeA && query ? countSearchMatches(activeA, query) : 0), [activeA, query]);
	const diff = useMemo(() => (compare && activeA && activeB ? computeDiffIndices(activeA, activeB) : null), [compare, activeA, activeB]);

	const nothingLoaded = !activeA && !activeB;

	return (
		<main className="container py-10 space-y-6">
			<section className="flex flex-col sm:flex-row sm:flex-wrap gap-3 items-stretch sm:items-center surface p-4">
				<input ref={inputARef} type="file" className="hidden" />
				<input ref={inputBRef} type="file" className="hidden" />
				<button className="btn btn-ghost w-full sm:w-auto" onClick={() => handleOpenFile(inputARef, (r) => setFileA(r), (b) => setEditedA(b))}>Open File A</button>
				<button className="btn btn-ghost w-full sm:w-auto" onClick={() => handleOpenFile(inputBRef, (r) => setFileB(r), (b) => setEditedB(b))}>Open File B</button>
				<label className="inline-flex items-center gap-2 sm:ml-2 text-sm subtle">
					<input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Compare
				</label>
				<button className="btn btn-primary disabled:opacity-50 w-full sm:w-auto" onClick={() => activeA && downloadBytes(activeA, fileA?.detected?.suggestedName || 'reconstructed-A.bin')} disabled={!activeA}>Download A</button>
				<button className="btn btn-primary disabled:opacity-50 w-full sm:w-auto" onClick={() => activeB && downloadBytes(activeB, fileB?.detected?.suggestedName || 'reconstructed-B.bin')} disabled={!activeB}>Download B</button>
				<div className="sm:ml-auto w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
					<label className="subtle text-sm sm:whitespace-nowrap">Bytes/row</label>
					<input type="number" min={8} max={32} step={1} value={bytesPerRow} onChange={(e) => setBytesPerRow(Math.max(8, Math.min(32, Number(e.target.value) || 16)))} className="w-full sm:w-20 bg-surface border border-white/10 rounded px-2 py-1" />
					<input className="bg-surface border border-white/10 rounded px-2 py-1 w-full sm:w-64" placeholder="Search (hex or ASCII)" value={query} onChange={(e) => setQuery(e.target.value)} />
					{activeA && query && (<span className="sm:ml-3 subtle text-sm">Matches A: {matchCountA}</span>)}
				</div>
			</section>

			{error && (
				<div className="surface border-red-800 text-red-200 p-3">{error}</div>
			)}

			<section className="grid grid-cols-1 gap-6">
				{nothingLoaded ? (
					<div className="subtle surface p-6">Upload a file to begin. Use Compare to load B and highlight differences.</div>
				) : (
					<div className={`grid ${compare ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
						{activeA ? (
							<div className="space-y-2">
								<div className="subtle text-sm flex items-center gap-3">
									<span>A {fileA?.detected?.extension ? `(.${fileA.detected.extension})` : ''}</span>
									<span>Size: {formatBytes(activeA.length)}</span>
									{fileA?.detected?.mime && <span>MIME: {fileA.detected.mime}</span>}
								</div>
								<HexEditor bytes={activeA} onChange={setEditedA} bytesPerRow={bytesPerRow} query={query} diffIndices={compare && diff ? diff : null} />
							</div>
						) : null}
						{compare && activeB ? (
							<div className="space-y-2">
								<div className="subtle text-sm flex items-center gap-3">
									<span>B {fileB?.detected?.extension ? `(.${fileB.detected.extension})` : ''}</span>
									<span>Size: {formatBytes(activeB.length)}</span>
									{fileB?.detected?.mime && <span>MIME: {fileB.detected.mime}</span>}
								</div>
								<HexEditor bytes={activeB} onChange={setEditedB} bytesPerRow={bytesPerRow} query={query} diffIndices={compare && diff ? diff : null} />
							</div>
						) : null}
					</div>
				)}
			</section>
		</main>
	);
}

