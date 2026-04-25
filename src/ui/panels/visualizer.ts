import type { Rect } from '../layout'
import type XMPlayer from '../../xmlib/player'
import { hb } from '../patternFormat'

const scopeScratch = new Float32Array(256)

export function drawVisualizerPanel (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	player: XMPlayer,
	freq: Uint8Array,
	orderScroll: number
) {
	ctx.save()
	ctx.beginPath()
	ctx.rect(r.x + 1, r.y + 1, r.w - 2, r.h - 2)
	ctx.clip()

	ctx.strokeStyle = 'rgb(0,129,255)'
	ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)

	const ordW = Math.min(140, r.w * 0.28)
	const gx = r.x + ordW + 4
	const gw = r.w - ordW - 12
	const ghSpec = Math.min(100, r.h * 0.28)
	const gy0 = r.y + 8
	const gyStereo = gy0 + ghSpec + 8
	const hStereo = 36
	const gyScope = gyStereo + hStereo + 8
	const hScope = r.y + r.h - gyScope - 8
	const chn = player.channelsNum

	// order list
	ctx.fillStyle = 'rgb(30,30,40)'
	ctx.fillRect(r.x + 4, gy0, ordW - 8, r.h - 16)
	ctx.fillStyle = 'rgb(180,180,200)'
	ctx.font = '13px VGA'
	ctx.textBaseline = 'top'
	const sl = player.songLength
	const pat = player.patternOrderTable
	for (let i = 0; i < Math.min(24, sl); i++) {
		const idx = i + orderScroll
		if (idx >= sl) break
		const cur = idx === player.position
		ctx.fillStyle = cur ? 'rgb(0,80,160)' : 'rgb(40,40,55)'
		ctx.fillRect(r.x + 6, gy0 + i * 16 + 2, ordW - 12, 15)
		ctx.fillStyle = cur ? 'rgb(200,230,255)' : 'rgb(200,200,210)'
		ctx.fillText(`${hb(idx)}:${hb(pat[idx])}`, r.x + 8, gy0 + i * 16 + 2)
	}

	// spectrum
	const step = Math.max(1, Math.floor(freq.length / (gw / 2)))
	let x = gx
	for (let i = 0; i < freq.length && x < gx + gw; i += step) {
		let v = 0
		for (let j = 0; j < step && i + j < freq.length; j++) v = Math.max(v, freq[i + j])
		const bh = (v / 255) * ghSpec
		ctx.fillStyle = 'rgb(180,40,40)'
		ctx.fillRect(x, gy0 + ghSpec - bh, 2, bh)
		x += 3
	}

	// stereo field
	ctx.fillStyle = 'rgb(25,25,35)'
	ctx.fillRect(gx, gyStereo, gw, hStereo)
	for (let c = 0; c < chn; c++) {
		const pan = player.getChannelFinalPan(c)
		const vu = player.getVuPeak(c)
		const px = gx + pan * gw
		const py = gyStereo + hStereo * 0.5
		const rad = 2 + vu * 14
		ctx.fillStyle = `rgb(${80 + c * 8},${200 - c * 4},255)`
		ctx.beginPath()
		ctx.arc(px, py, rad, 0, Math.PI * 2)
		ctx.fill()
	}

	// scopes
	const rows = Math.min(chn, 16)
	const sh = hScope / rows
	for (let c = 0; c < rows; c++) {
		const sy = gyScope + c * sh
		ctx.fillStyle = 'rgb(20,20,28)'
		ctx.fillRect(gx, sy, gw, sh - 1)
		player.copyScopeRing(c, scopeScratch)
		ctx.strokeStyle = 'rgb(0,200,120)'
		ctx.beginPath()
		for (let i = 0; i < 256; i++) {
			const vx = gx + (i / 255) * gw
			const vy = sy + sh * 0.5 - scopeScratch[i] * sh * 0.35
			if (i === 0) ctx.moveTo(vx, vy)
			else ctx.lineTo(vx, vy)
		}
		ctx.stroke()
		ctx.fillStyle = 'rgb(140,140,160)'
		ctx.font = '10px VGA'
		ctx.fillText(hb(c + 1), gx + 2, sy + 2)
	}
	ctx.restore()
}

export function hitOrderList (r: Rect, x: number, y: number, orderScroll: number): number | null {
	const ordW = Math.min(140, r.w * 0.28)
	const gy0 = r.y + 8
	if (x < r.x + 4 || x > r.x + ordW - 4) return null
	const sl = 24
	for (let i = 0; i < sl; i++) {
		const yy = gy0 + i * 16 + 2
		if (y >= yy && y < yy + 15) return i + orderScroll
	}
	return null
}
