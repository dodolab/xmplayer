export type Rect = { x: number; y: number; w: number; h: number }

/** Fractions of virtual width (0–1) and height (0–1). */
export function rect (vw: number, vh: number, fx: number, fy: number, fw: number, fh: number): Rect {
	return {
		x: fx * vw,
		y: fy * vh,
		w: fw * vw,
		h: fh * vh
	}
}

export function inset (r: Rect, dx: number, dy: number): Rect {
	return { x: r.x + dx, y: r.y + dy, w: r.w - 2 * dx, h: r.h - 2 * dy }
}

export function contains (r: Rect, x: number, y: number): boolean {
	return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
}

export type PanelLayout = {
	toolbar: Rect
	pattern: Rect
	bottom: Rect
	playlist: Rect
	instrument: Rect
	visualizer: Rect
}

export function computePanels (vw: number, vh: number): PanelLayout {
	const toolbarH = Math.min(120, vh * 0.11)
	const bottomH = Math.min(380, vh * 0.35)
	const patternH = vh - toolbarH - bottomH
	const yb = toolbarH + patternH
	return {
		toolbar: { x: 0, y: 0, w: vw, h: toolbarH },
		pattern: { x: 0, y: toolbarH, w: vw, h: patternH },
		bottom: { x: 0, y: yb, w: vw, h: bottomH },
		playlist: { x: 0, y: yb, w: vw * 0.22, h: bottomH },
		instrument: { x: vw * 0.22, y: yb, w: vw * 0.38, h: bottomH },
		visualizer: { x: vw * 0.6, y: yb, w: vw * 0.4, h: bottomH }
	}
}
