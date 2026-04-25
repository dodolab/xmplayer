import type { Rect } from '../layout'
import type XMPlayer from '../../xmlib/player'
import { notef, hb } from '../patternFormat'

/** Reserved height at bottom of pattern panel for per-channel gain strip */
export const patternGainStripH = 28

export type PatternPanelState = {
	scrollX: number
	fontSize: number
	chColW: number
	rowColW: number
	headerH: number
	rowH: number
	visibleRows: number
	markerIndex: number
}

export function defaultPatternState (): PatternPanelState {
	return {
		scrollX: 0,
		fontSize: 16,
		chColW: 120,
		rowColW: 36,
		headerH: 22,
		rowH: 18,
		visibleRows: 16,
		markerIndex: 6
	}
}

export function layoutPatternMetrics (ctx: CanvasRenderingContext2D, r: Rect, channelsNum: number, st: PatternPanelState) {
	const pad = 8
	const innerH = r.h - pad * 2 - patternGainStripH - 6
	st.rowH = Math.max(14, Math.min(22, (innerH - st.headerH - 4) / (st.visibleRows + 1)))
	st.fontSize = Math.floor(st.rowH * 0.95)
	ctx.font = `${st.fontSize}px VGA`
	const probe = notef(0x3c, 1, 0x40, 0x47, 0x01)
	st.chColW = Math.ceil(ctx.measureText(probe).width) + 4
	st.rowColW = Math.ceil(ctx.measureText('00|').width) + 4
	const totalW = st.rowColW + channelsNum * st.chColW
	const maxScroll = Math.max(0, totalW - (r.w - pad * 2))
	if (st.scrollX > maxScroll) st.scrollX = maxScroll
}

export function drawPatternPanel (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	player: XMPlayer,
	st: PatternPanelState,
	pdata: Uint8Array | null
) {
	const pad = 8
	ctx.save()
	ctx.beginPath()
	ctx.rect(r.x + pad, r.y + pad, r.w - pad * 2, r.h - pad * 2 - patternGainStripH - 6)
	ctx.clip()

	const ox = r.x + pad - st.scrollX
	const oy = r.y + pad

	ctx.font = `${st.fontSize}px VGA`
	ctx.textBaseline = 'middle'

	const chn = player.channelsNum
	if (!pdata || chn <= 0) {
		ctx.fillStyle = 'rgb(200,200,200)'
		ctx.fillText('No pattern data', r.x + pad, r.y + pad + 20)
		ctx.restore()
		return
	}

	const rows = Math.floor(pdata.length / (5 * chn))

	// headers
	ctx.fillStyle = 'rgb(100,100,140)'
	ctx.fillRect(r.x + pad, oy, r.w - pad * 2, st.headerH)
	ctx.fillStyle = 'rgb(220,220,255)'
	ctx.fillText('row', ox, oy + st.headerH / 2)
	for (let c = 0; c < chn; c++) {
		const cx = ox + st.rowColW + c * st.chColW
		const muted = player.channelMuted[c]
		const solo = player.soloChannelIndex === c
		ctx.fillStyle = solo ? 'rgb(255,200,0)' : muted ? 'rgb(120,80,80)' : 'rgb(200,220,255)'
		const lab = solo ? `S${c + 1}` : muted ? `M${c + 1}` : `${hb(c + 1)}`
		ctx.fillText(lab, cx + 2, oy + st.headerH / 2)
	}

	const baseY = oy + st.headerH + 4
	for (let vis = 0; vis < st.visibleRows; vis++) {
		const i = player.row - st.markerIndex + vis
		if (i < 0 || i >= rows) continue
		const y = baseY + vis * st.rowH + st.rowH / 2
		const isCur = i === player.row
		ctx.fillStyle = isCur ? 'rgb(0,40,80)' : 'transparent'
		if (isCur) ctx.fillRect(r.x + pad, y - st.rowH / 2, r.w - pad * 2, st.rowH)
		ctx.fillStyle = isCur ? 'rgb(120,200,255)' : 'rgb(255,255,255)'
		ctx.fillText(hb(i) + '|', ox, y)
		let cx = ox + st.rowColW
		const pp = i * 5 * chn
		for (let c = 0; c < chn; c++) {
			const cell = notef(
				pdata[pp + c * 5 + 0],
				pdata[pp + c * 5 + 1],
				pdata[pp + c * 5 + 2],
				pdata[pp + c * 5 + 3],
				pdata[pp + c * 5 + 4]
			)
			ctx.fillText(cell, cx + 2, y)
			cx += st.chColW
		}
	}

	ctx.restore()

	drawChannelGainStrip(ctx, r, player)
}

export function drawChannelGainStrip (ctx: CanvasRenderingContext2D, r: Rect, player: XMPlayer) {
	const n = player.channelsNum
	if (n <= 0) return
	const y0 = r.y + r.h - patternGainStripH + 2
	const strip: Rect = { x: r.x + 8, y: y0, w: r.w - 16, h: patternGainStripH - 6 }
	ctx.fillStyle = 'rgb(18,18,28)'
	ctx.fillRect(strip.x, strip.y, strip.w, strip.h)
	ctx.strokeStyle = 'rgb(80,80,100)'
	ctx.strokeRect(strip.x + 0.5, strip.y + 0.5, strip.w - 1, strip.h - 1)
	const slot = strip.w / n
	for (let c = 0; c < n; c++) {
		const g = Math.max(0, Math.min(2, player.channelGain[c] ?? 1))
		const fillH = (g / 2) * (strip.h - 6)
		ctx.fillStyle = player.channelMuted[c] ? 'rgb(80,40,40)' : 'rgb(40,90,50)'
		ctx.fillRect(strip.x + c * slot + 3, strip.y + strip.h - 3 - fillH, slot - 6, fillH)
		ctx.fillStyle = 'rgb(140,140,160)'
		ctx.font = '9px VGA'
		ctx.textBaseline = 'bottom'
		ctx.fillText(`${c + 1}`, strip.x + c * slot + 4, strip.y + strip.h - 1)
	}
	ctx.fillStyle = 'rgb(160,160,180)'
	ctx.font = '10px VGA'
	ctx.textBaseline = 'top'
	ctx.fillText('CH gain (click)', strip.x + 4, strip.y + 2)
}

export function hitChannelGainStrip (r: Rect, x: number, y: number, player: XMPlayer): number | null {
	const n = player.channelsNum
	if (n <= 0) return null
	const y0 = r.y + r.h - patternGainStripH + 2
	const strip = { x: r.x + 8, y: y0, w: r.w - 16, h: patternGainStripH - 6 }
	if (x < strip.x || x > strip.x + strip.w || y < strip.y || y > strip.y + strip.h) return null
	const slot = strip.w / n
	const c = Math.floor((x - strip.x) / slot)
	if (c < 0 || c >= n) return null
	return c
}

/** Map click y in strip to linear gain 0..2 */
export function channelGainFromClickY (r: Rect, y: number, _player: XMPlayer, _channel: number): number {
	const y0 = r.y + r.h - patternGainStripH + 2
	const strip = { x: r.x + 8, y: y0, w: r.w - 16, h: patternGainStripH - 6 }
	const t = 1 - (y - strip.y - 3) / (strip.h - 6)
	return Math.max(0, Math.min(2, t * 2))
}

export function patternPanelWheel (r: Rect, st: PatternPanelState, dy: number, channelsNum: number) {
	const pad = 8
	const totalW = st.rowColW + channelsNum * st.chColW
	const maxScroll = Math.max(0, totalW - (r.w - pad * 2))
	st.scrollX = Math.max(0, Math.min(maxScroll, st.scrollX + dy * 24))
}

export type PatternHit =
	| { kind: 'row'; row: number }
	| { kind: 'header'; channel: number }
	| null

export function hitPattern (
	r: Rect,
	player: XMPlayer,
	st: PatternPanelState,
	x: number,
	y: number,
	patternRowCount: number
): PatternHit {
	const pad = 8
	const ix = r.x + pad
	const iy = r.y + pad
	const iw = r.w - pad * 2
	const ih = r.h - pad * 2 - patternGainStripH - 6
	if (x < ix || y < iy || x > ix + iw || y > iy + ih) return null

	const ox = ix - st.scrollX
	const oy = iy
	const chn = player.channelsNum

	if (y < oy + st.headerH) {
		if (x < ox + st.rowColW) return null
		const cx = x - ox - st.rowColW
		const ch = Math.floor(cx / st.chColW)
		if (ch >= 0 && ch < chn) return { kind: 'header', channel: ch }
		return null
	}

	const baseY = oy + st.headerH + 4
	const rows = patternRowCount
	for (let vis = 0; vis < st.visibleRows; vis++) {
		const i = player.row - st.markerIndex + vis
		if (i < 0 || i >= rows) continue
		const y0 = baseY + vis * st.rowH
		if (y >= y0 && y < y0 + st.rowH) {
			if (x >= ox && x < ox + st.rowColW + chn * st.chColW) return { kind: 'row', row: i }
		}
	}
	return null
}
