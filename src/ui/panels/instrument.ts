import type { Rect } from '../layout'
import type { Instrument, Sample } from '../../xmlib/engine/xmfile'
import type XMPlayer from '../../xmlib/player'

function drawWaveform (ctx: CanvasRenderingContext2D, r: Rect, s: Sample) {
	const data = s.data
	if (!data || data.length < 2) return
	const n = data.length
	const buckets = Math.floor(r.w - 4)
	const step = n / buckets
	ctx.save()
	ctx.beginPath()
	ctx.rect(r.x, r.y, r.w, r.h)
	ctx.clip()
	ctx.fillStyle = 'rgb(15,15,25)'
	ctx.fillRect(r.x, r.y, r.w, r.h)
	ctx.fillStyle = 'rgb(0,180,220)'
	const mid = r.y + r.h / 2
	for (let bx = 0; bx < buckets; bx++) {
		const start = Math.floor(bx * step)
		const end = Math.floor((bx + 1) * step)
		let lo = 1
		let hi = -1
		for (let i = start; i < end && i < n; i++) {
			const v = Math.max(-1, Math.min(1, data[i]))
			lo = Math.min(lo, v)
			hi = Math.max(hi, v)
		}
		const x = r.x + bx
		const y1 = mid - lo * mid * 0.85
		const y2 = mid - hi * mid * 0.85
		const top = Math.min(y1, y2)
		ctx.fillRect(x, top, 1, Math.max(1, Math.abs(y2 - y1)))
	}
	ctx.restore()
}

function drawEnv (ctx: CanvasRenderingContext2D, r: Rect, env: Float32Array, len: number, label: string) {
	ctx.fillStyle = 'rgb(20,20,30)'
	ctx.fillRect(r.x, r.y, r.w, r.h)
	ctx.strokeStyle = 'rgb(200,120,40)'
	ctx.beginPath()
	const cap = Math.min(len, env.length, 324)
	for (let i = 0; i <= cap; i++) {
		const x = r.x + (i / Math.max(1, cap)) * (r.w - 4)
		const y = r.y + r.h - 4 - env[i] * (r.h - 8)
		if (i === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.stroke()
	ctx.fillStyle = 'rgb(180,180,200)'
	ctx.font = '11px VGA'
	ctx.fillText(label, r.x + 2, r.y + 2)
}

export function drawInstrumentList (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	player: XMPlayer,
	selectedInst: number
) {
	ctx.fillStyle = 'rgb(25,25,35)'
	ctx.fillRect(r.x, r.y, r.w, r.h)
	ctx.strokeStyle = 'rgb(80,80,120)'
	ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)
	const line = 16
	const max = Math.min(player.sampleNum, Math.floor(r.h / line))
	for (let i = 0; i < max; i++) {
		let name = player.getSampleName(i)
		if (!name.length) name = '--'
		const on = player.isNoteOnForInstrument(i)
		const sel = i === selectedInst
		ctx.fillStyle = sel ? 'rgb(0,60,120)' : 'rgb(40,40,55)'
		ctx.fillRect(r.x + 2, r.y + 2 + i * line, r.w - 4, line - 2)
		ctx.fillStyle = on ? 'rgb(0,129,255)' : sel ? 'rgb(220,240,255)' : 'rgb(200,200,210)'
		ctx.font = '12px VGA'
		ctx.textBaseline = 'top'
		ctx.fillText(name.slice(0, 18), r.x + 4, r.y + 4 + i * line)
	}
}

export function hitInstrumentList (r: Rect, x: number, y: number, sampleNum: number): number | null {
	const line = 16
	const max = Math.min(sampleNum, Math.floor(r.h / line))
	for (let i = 0; i < max; i++) {
		const yy = r.y + 2 + i * line
		if (x >= r.x + 2 && x < r.x + r.w - 2 && y >= yy && y < yy + line - 2) return i
	}
	return null
}

export function drawInstrumentPanel (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	inst: Instrument | null,
	sampleIndex: number
) {
	ctx.strokeStyle = 'rgb(0,129,255)'
	ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1)
	if (!inst) {
		ctx.fillStyle = 'rgb(160,160,180)'
		ctx.font = '14px VGA'
		ctx.fillText('No instrument', r.x + 8, r.y + 12)
		return
	}

	const titleH = 22
	ctx.fillStyle = 'rgb(220,220,240)'
	ctx.font = '14px VGA'
	ctx.textBaseline = 'top'
	const nm = inst.name.trim() || '(unnamed)'
	ctx.fillText(nm.slice(0, 48), r.x + 6, r.y + 4)

	const samp = inst.samples[Math.min(sampleIndex, inst.samples.length - 1)]
	const metaY = r.y + titleH
	ctx.fillStyle = 'rgb(180,180,200)'
	ctx.font = '12px VGA'
	if (samp) {
		const rel = samp.relativeNote
		const ft = samp.fineTune
		const semi = rel + ft / 128.0
		ctx.fillText(`Smp:${sampleIndex + 1}/${inst.samplesNum}  rel:${rel}  fine:${ft}  ~${semi.toFixed(2)} st`, r.x + 6, metaY)
	}

	const waveY = metaY + 20
	const waveH = Math.min(120, r.h * 0.28)
	const waveR = { x: r.x + 4, y: waveY, w: r.w - 8, h: waveH }
	if (samp) drawWaveform(ctx, waveR, samp)

	const envY = waveY + waveH + 8
	const envH = (r.y + r.h - envY - 6) / 2
	if (inst.volFlags & 1) {
		drawEnv(ctx, { x: r.x + 4, y: envY, w: r.w - 8, h: envH - 4 }, inst.volEnvelope, inst.volEnvLength, 'Vol env')
	}
	if (inst.panFlags & 1) {
		drawEnv(ctx, { x: r.x + 4, y: envY + envH, w: r.w - 8, h: envH - 4 }, inst.panEnvelope, inst.panEnvLength, 'Pan env')
	}
}
