import type { Rect } from './layout'

export function drawPanelChrome (ctx: CanvasRenderingContext2D, r: Rect, title: string) {
	ctx.strokeStyle = 'rgb(0,129,255)'
	ctx.lineWidth = 1
	ctx.strokeRect(Math.floor(r.x) + 0.5, Math.floor(r.y) + 0.5, Math.floor(r.w) - 1, Math.floor(r.h) - 1)
	ctx.fillStyle = 'rgb(180,180,180)'
	ctx.font = `${Math.min(18, r.h * 0.08)}px VGA`
	ctx.textBaseline = 'top'
	ctx.fillText(title, r.x + 4, r.y + 2)
}

export type ButtonState = { hover: boolean; pressed: boolean }

export function drawTextButton (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	label: string,
	st: ButtonState,
	fontPx: number
) {
	const bg = st.pressed ? 'rgb(40,40,80)' : st.hover ? 'rgb(50,50,60)' : 'rgb(20,20,20)'
	ctx.fillStyle = bg
	ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h))
	ctx.strokeStyle = 'rgb(200,200,200)'
	ctx.strokeRect(Math.floor(r.x) + 0.5, Math.floor(r.y) + 0.5, Math.floor(r.w) - 1, Math.floor(r.h) - 1)
	ctx.fillStyle = st.hover ? 'rgb(255,255,200)' : 'rgb(255,255,255)'
	ctx.font = `${fontPx}px VGA`
	ctx.textBaseline = 'middle'
	ctx.fillText(label, r.x + 6, r.y + r.h / 2)
}

export function drawToggle (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	label: string,
	on: boolean,
	st: ButtonState,
	fontPx: number
) {
	const bg = on ? 'rgb(0,60,40)' : 'rgb(30,30,30)'
	ctx.fillStyle = st.hover ? 'rgb(60,60,80)' : bg
	ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h))
	ctx.strokeStyle = on ? 'rgb(0,200,120)' : 'rgb(120,120,120)'
	ctx.strokeRect(Math.floor(r.x) + 0.5, Math.floor(r.y) + 0.5, Math.floor(r.w) - 1, Math.floor(r.h) - 1)
	ctx.fillStyle = 'rgb(255,255,255)'
	ctx.font = `${fontPx}px VGA`
	ctx.textBaseline = 'middle'
	ctx.fillText((on ? '[X] ' : '[ ] ') + label, r.x + 4, r.y + r.h / 2)
}

export function drawHSlider (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	label: string,
	value01: number,
	fontPx: number
) {
	ctx.fillStyle = 'rgb(25,25,25)'
	ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.floor(r.w), Math.floor(r.h))
	ctx.strokeStyle = 'rgb(100,100,120)'
	ctx.strokeRect(Math.floor(r.x) + 0.5, Math.floor(r.y) + 0.5, Math.floor(r.w) - 1, Math.floor(r.h) - 1)
	const pad = 4
	const trackY = r.y + r.h * 0.62
	const trackH = Math.max(4, r.h * 0.12)
	const tw = r.w - pad * 2 - 80
	const tx = r.x + pad + 70
	ctx.fillStyle = 'rgb(60,60,80)'
	ctx.fillRect(tx, trackY, tw, trackH)
	const knobX = tx + value01 * tw
	ctx.fillStyle = 'rgb(0,129,255)'
	ctx.fillRect(knobX - 2, trackY - 1, 5, trackH + 2)
	ctx.fillStyle = 'rgb(220,220,220)'
	ctx.font = `${fontPx}px VGA`
	ctx.textBaseline = 'middle'
	ctx.fillText(label, r.x + pad, r.y + r.h * 0.35)
}

/** Returns new value 0..1 if click/drag inside track */
export function hSliderHit (
	r: Rect,
	x: number,
	y: number,
	drag: boolean
): number | null {
	const pad = 4
	const tw = r.w - pad * 2 - 80
	const tx = r.x + pad + 70
	const trackY = r.y + r.h * 0.62
	const trackH = Math.max(4, r.h * 0.12)
	if (y >= trackY - 6 && y <= trackY + trackH + 6 && x >= tx && x <= tx + tw) {
		return Math.max(0, Math.min(1, (x - tx) / tw))
	}
	if (drag) return null
	return null
}
