import type { Rect } from '../layout'
import type { ModFile } from '../modfile'
import { drawTextButton, type ButtonState } from '../widgets'

export type SortMode = 'orig' | 'az' | 'za' | 'shuffle'

export function cycleSortMode (m: SortMode): SortMode {
	return m === 'orig' ? 'az' : m === 'az' ? 'za' : m === 'za' ? 'shuffle' : 'orig'
}

export function sortLabel (m: SortMode): string {
	return m === 'orig' ? 'Orig' : m === 'az' ? 'A-Z' : m === 'za' ? 'Z-A' : 'Shuf'
}

export function buildDisplayList (files: ModFile[], mode: SortMode): ModFile[] {
	const a = [...files]
	if (mode === 'az') a.sort((x, y) => x.name.localeCompare(y.name))
	else if (mode === 'za') a.sort((x, y) => y.name.localeCompare(x.name))
	else if (mode === 'shuffle') {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]]
		}
	}
	return a
}

export function drawPlaylist (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	displayFiles: ModFile[],
	currentIndex: number,
	scroll: number,
	sortMode: SortMode,
	hoverControl: PlaylistControlHit | null,
	pressedControl: PlaylistControlHit | null
) {
	ctx.strokeStyle = 'rgb(0,129,255)'
	ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)
	ctx.fillStyle = 'rgb(200,200,220)'
	ctx.font = '14px VGA'
	ctx.textBaseline = 'top'
	ctx.fillText(`Playlist  sort:${sortLabel(sortMode)}`, r.x + 6, r.y + 4)
	const btn = playlistButtonRects(r)
	const st = (id: PlaylistControlHit): ButtonState => ({ hover: hoverControl === id, pressed: pressedControl === id })
	drawTextButton(ctx, btn.open, 'Open', st('open'), 11)
	drawTextButton(ctx, btn.sort, 'Sort', st('sort'), 11)
	// drawTextButton sets textBaseline to middle; restore for list row labels
	ctx.textBaseline = 'top'

	const lineH = 18
	const maxVis = Math.floor((r.h - 28) / lineH)
	for (let i = 0; i < maxVis; i++) {
		const idx = i + scroll
		if (idx >= displayFiles.length) break
		const f = displayFiles[idx]
		const sel = idx === currentIndex
		ctx.fillStyle = sel ? 'rgb(0,70,140)' : 'rgb(35,35,45)'
		ctx.fillRect(r.x + 4, r.y + 24 + i * lineH, r.w - 8, lineH - 2)
		ctx.fillStyle = sel ? 'rgb(220,240,255)' : 'rgb(200,200,210)'
		const name = f.name.length > 36 ? f.name.slice(0, 34) + '..' : f.name
		ctx.fillText(name, r.x + 8, r.y + 24 + i * lineH)
	}
}

export function hitPlaylist (r: Rect, x: number, y: number, scroll: number, displayFiles: ModFile[]): number | null {
	const lineH = 18
	const maxVis = Math.floor((r.h - 28) / lineH)
	for (let i = 0; i < maxVis; i++) {
		const yy = r.y + 24 + i * lineH
		if (y >= yy && y < yy + lineH - 2 && x >= r.x + 4 && x < r.x + r.w - 4) {
			const idx = i + scroll
			if (idx < displayFiles.length) return idx
		}
	}
	return null
}

export type PlaylistControlHit = 'open' | 'sort'

export function hitPlaylistControl (r: Rect, x: number, y: number): PlaylistControlHit | null {
	const btn = playlistButtonRects(r)
	if (contains(btn.open, x, y)) return 'open'
	if (contains(btn.sort, x, y)) return 'sort'
	return null
}

function playlistButtonRects (r: Rect): { open: Rect; sort: Rect } {
	const pad = 4
	const w = Math.min(58, Math.max(44, r.w * 0.22))
	const h = 16
	const y = r.y + 3
	const sort: Rect = { x: r.x + r.w - pad - w, y, w, h }
	const open: Rect = { x: sort.x - 4 - w, y, w, h }
	return { open, sort }
}

function contains (r: Rect, x: number, y: number): boolean {
	return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
}
