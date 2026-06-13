import type { Rect } from './layout'
import type XMPlayer from '../xmlib/player'

// A fancy mode that displays some cracktro-like gradient animation


const COPPER: [number, number, number][] = [
	[255, 255, 255],
	[200, 230, 255],
	[0, 136, 255],
	[0, 0, 200],
	[255, 255, 0],
	[255, 136, 0],
	[255, 0, 0],
	[200, 0, 80],
	[136, 0, 255],
	[255, 255, 255]
]

const BASE_FONT = '16px VGA'
const SCROLL_SPEED = 0.55

function copperRgb (phase: number): string {
	if (!Number.isFinite(phase)) phase = 0
	const len = COPPER.length
	const wrapped = ((phase % len) + len) % len
	const idx = Math.floor(wrapped)
	const next = (idx + 1) % len
	const frac = wrapped - idx
	const a = COPPER[idx]
	const b = COPPER[next]
	const r = Math.round(a[0] + (b[0] - a[0]) * frac)
	const g = Math.round(a[1] + (b[1] - a[1]) * frac)
	const bl = Math.round(a[2] + (b[2] - a[2]) * frac)
	return `rgb(${r},${g},${bl})`
}

type Star = { x: number; y: number; z: number }
let stars: Star[] | null = null

function ensureStars (count: number) {
	if (stars && stars.length === count) return
	stars = Array.from({ length: count }, () => ({
		x: (Math.random() - 0.5) * 1920,
		y: (Math.random() - 0.5) * 1080,
		z: Math.random() * 900 + 100
	}))
}

function drawScaledText (
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	scale: number,
	color: string,
	baseline: CanvasTextBaseline = 'top'
) {
	ctx.save()
	ctx.font = BASE_FONT
	ctx.fillStyle = color
	ctx.textBaseline = baseline
	ctx.translate(x, y)
	ctx.scale(scale, scale)
	ctx.fillText(text, 0, 0)
	ctx.restore()
}

function drawScaledCopperText3D (
	ctx: CanvasRenderingContext2D,
	text: string,
	cx: number,
	y: number,
	scale: number,
	time: number,
	depth = 5
) {
	ctx.save()
	ctx.font = BASE_FONT
	ctx.textBaseline = 'top'
	const tw = ctx.measureText(text).width * scale
	const x = cx - tw * 0.5
	for (let d = depth; d >= 1; d--) {
		ctx.fillStyle = copperRgb((time * 0.04 + d * 0.7) % COPPER.length)
		ctx.save()
		ctx.translate(x + d * 2, y + d * 2)
		ctx.scale(scale, scale)
		ctx.fillText(text, 0, 0)
		ctx.restore()
	}
	ctx.fillStyle = copperRgb((time * 0.04) % COPPER.length)
	ctx.save()
	ctx.translate(x, y)
	ctx.scale(scale, scale)
	ctx.fillText(text, 0, 0)
	ctx.restore()
	ctx.restore()
}

export function drawStarfield (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
	ensureStars(400)
	const cx = w * 0.5
	const cy = h * 0.5
	for (const s of stars!) {
		s.z -= 2 + Math.sin(time * 0.0008) * 0.8
		if (s.z < 1) {
			s.z = 1000
			s.x = (Math.random() - 0.5) * w
			s.y = (Math.random() - 0.5) * h
		}
		const k = 220 / s.z
		const sx = cx + s.x * k
		const sy = cy + s.y * k
		if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue
		const b = Math.min(255, Math.floor(320 - s.z * 0.22))
		const tint = Math.floor((time * 0.002 + s.z * 0.01) % 3)
		if (tint === 0) ctx.fillStyle = `rgb(${b},${b},${b})`
		else if (tint === 1) ctx.fillStyle = `rgb(${b},${Math.floor(b * 0.7)},${b})`
		else ctx.fillStyle = `rgb(${b},${b},${Math.floor(b * 0.6)})`
		const sz = s.z < 300 ? 2 : 1
		ctx.fillRect(Math.floor(sx), Math.floor(sy), sz, sz)
	}
}

export function fillCopperBars (ctx: CanvasRenderingContext2D, r: Rect, time: number, barH = 4) {
	if (r.w <= 0 || r.h <= 0 || barH <= 0) return
	const offset = (time * 0.06) % (barH * COPPER.length)
	for (let y = r.y; y < r.y + r.h; y += barH) {
		const phase = (y + offset) / (barH * 1.8)
		ctx.fillStyle = copperRgb(phase)
		ctx.fillRect(Math.floor(r.x), Math.floor(y), Math.floor(r.w), Math.min(barH, r.y + r.h - y))
	}
}

function drawCornerBrackets (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
	const len = 48
	const pad = 18
	const phase = (time * 0.003) % COPPER.length
	ctx.strokeStyle = copperRgb(phase)
	ctx.lineWidth = 3
	const corners = [
		[pad, pad, pad + len, pad, pad, pad + len],
		[w - pad, pad, w - pad - len, pad, w - pad, pad + len],
		[pad, h - pad, pad + len, h - pad, pad, h - pad - len],
		[w - pad, h - pad, w - pad - len, h - pad, w - pad, h - pad - len]
	]
	for (const [x1, y1, x2, y2, x3, y3] of corners) {
		ctx.beginPath()
		ctx.moveTo(x2, y2)
		ctx.lineTo(x1, y1)
		ctx.lineTo(x3, y3)
		ctx.stroke()
	}
	ctx.lineWidth = 1
}

function drawVerticalCopperPillars (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
	const pw = 28
	fillCopperBars(ctx, { x: 12, y: 80, w: pw, h: h - 200 }, time, 3)
	fillCopperBars(ctx, { x: w - 12 - pw, y: 80, w: pw, h: h - 200 }, time + 40, 3)
}

function drawOscillatingWave (
	ctx: CanvasRenderingContext2D,
	w: number,
	baseY: number,
	time: number,
	phaseOff: number,
	amp: number,
	freq: number
) {
	ctx.beginPath()
	for (let x = 0; x <= w; x += 4) {
		const y = baseY + Math.sin(x * freq + time * 0.004 + phaseOff) * amp
		if (x === 0) ctx.moveTo(x, y)
		else ctx.lineTo(x, y)
	}
	ctx.strokeStyle = copperRgb((time * 0.003 + phaseOff) % COPPER.length)
	ctx.lineWidth = 2
	ctx.globalAlpha = 0.6
	ctx.stroke()
	ctx.globalAlpha = 1
	ctx.lineWidth = 1
}

function drawRotatingDiamonds (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
	const spots = [
		[120, 160], [w - 120, 160], [120, h - 200], [w - 120, h - 200],
		[w * 0.5, 100], [w * 0.5, h - 140]
	]
	for (let i = 0; i < spots.length; i++) {
		const [cx, cy] = spots[i]
		const size = 10 + Math.sin(time * 0.005 + i) * 4
		const angle = time * 0.002 + i * 1.1
		ctx.save()
		ctx.translate(cx + Math.sin(time * 0.003 + i * 2) * 12, cy + Math.cos(time * 0.004 + i) * 8)
		ctx.rotate(angle)
		ctx.fillStyle = copperRgb((time * 0.004 + i) % COPPER.length)
		ctx.beginPath()
		ctx.moveTo(0, -size)
		ctx.lineTo(size, 0)
		ctx.lineTo(0, size)
		ctx.lineTo(-size, 0)
		ctx.closePath()
		ctx.fill()
		ctx.restore()
	}
}

function drawHorizontalBands (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
	const bands = [h * 0.22, h * 0.55, h * 0.78]
	for (let i = 0; i < bands.length; i++) {
		const by = bands[i] + Math.sin(time * 0.003 + i * 2) * 6
		ctx.globalAlpha = 0.18
		fillCopperBars(ctx, { x: 60, y: by, w: w - 120, h: 8 }, time + i * 20, 2)
		ctx.globalAlpha = 1
	}
}

function drawSideGreetings (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
	const left = ['G', 'R', 'E', 'E', 'T', 'S', '!']
	const right = ['W', 'A', 'R', 'E', 'Z', '!']
	for (let i = 0; i < left.length; i++) {
		const ly = 200 + i * 52 + Math.sin(time * 0.004 + i) * 6
		const ry = 200 + i * 52 + Math.cos(time * 0.004 + i) * 6
		drawScaledText(ctx, left[i], 52, ly, 2, copperRgb((time * 0.003 + i) % COPPER.length))
		drawScaledText(ctx, right[i], w - 80, ry, 2, copperRgb((time * 0.003 + i + 3) % COPPER.length))
	}
}

function drawCracktroDecorations (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	time: number
) {
	drawHorizontalBands(ctx, w, h, time)
	drawVerticalCopperPillars(ctx, w, h, time)
	drawCornerBrackets(ctx, w, h, time)
	drawOscillatingWave(ctx, w, h * 0.3, time, 0, 14, 0.012)
	drawOscillatingWave(ctx, w, h * 0.62, time, 2.5, 18, 0.009)
	drawRotatingDiamonds(ctx, w, h, time)
	drawSideGreetings(ctx, w, h, time)

	const crosses = [
		[w * 0.15, h * 0.35], [w * 0.85, h * 0.35],
		[w * 0.15, h * 0.65], [w * 0.85, h * 0.65]
	]
	ctx.lineWidth = 2
	for (let i = 0; i < crosses.length; i++) {
		const [cx, cy] = crosses[i]
		const s = 8 + Math.sin(time * 0.006 + i) * 3
		ctx.strokeStyle = copperRgb((time * 0.005 + i * 1.5) % COPPER.length)
		ctx.beginPath()
		ctx.moveTo(cx - s, cy)
		ctx.lineTo(cx + s, cy)
		ctx.moveTo(cx, cy - s)
		ctx.lineTo(cx, cy + s)
		ctx.stroke()
	}
	ctx.lineWidth = 1
}

export function drawCracktroScene (
	ctx: CanvasRenderingContext2D,
	r: Rect,
	player: XMPlayer,
	songName: string,
	time: number
) {
	ctx.save()

	const cx = r.x + r.w * 0.5
	const title = (songName || 'UNKNOWN MODULE').replace(/\.xm$/i, '').toUpperCase()

	drawCracktroDecorations(ctx, r.w, r.h, time)

	const logoY = r.y + r.h * 0.1 + Math.sin(time * 0.002) * 12
	drawScaledCopperText3D(ctx, 'XMPLAYER', cx, logoY, 7.5, time, 8)

	const lines = [
		'THE WORLD-RULING',
		'XMPLAYER PROUDLY PRESENTS',
		title + '.',
		`BPM ${player.currentBpm || 125}  |  SPEED ${player.currentSpeed || 6}`
	]
	const midY = r.y + r.h * 0.4
	for (let i = 0; i < lines.length; i++) {
		const ox = Math.sin(time * 0.0035 + i * 1.4) * 32
		const oy = Math.cos(time * 0.004 + i * 0.9) * 14
		ctx.font = BASE_FONT
		const tw = ctx.measureText(lines[i]).width * 2.2
		drawScaledText(
			ctx,
			lines[i],
			cx - tw * 0.5 + ox,
			midY + i * 44 + oy,
			2.2,
			copperRgb((time * 0.003 + i * 0.6) % COPPER.length)
		)
	}

	const credY = r.y + r.h * 0.66 + Math.sin(time * 0.005) * 16
	drawScaledCopperText3D(ctx, 'CRACKTRO', cx, credY, 5.5, time, 7)

	const barY = r.y + r.h - 88
	const barH = 60
	fillCopperBars(ctx, { x: r.x, y: barY, w: r.w, h: barH }, time, 5)
	const scroll =
		`+++ WAREZ SCENE 1994 +++ XMPLAYER v2.0 +++ ${title} +++ ` +
		`GREETS TO FAIRLIGHT SKID ROW CLASS +++ CRACKED BY XMPLAYER CREW +++ `
	ctx.font = BASE_FONT
	const sw = ctx.measureText(scroll).width * 1.8
	const scrollX = r.x + r.w - ((time * SCROLL_SPEED) % (sw + r.w))
	const scrollY = barY + barH * 0.5
	drawScaledText(ctx, scroll, scrollX, scrollY - 8, 1.8, '#000', 'top')
	drawScaledText(ctx, scroll, scrollX - sw - r.w * 0.5, scrollY - 8, 1.8, '#000', 'top')

	ctx.restore()
}

/** Full-screen cracktro — the only thing visible in cracktro mode */
export function drawCracktroFullscreen (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	player: XMPlayer,
	songName: string,
	time: number
) {
	const screen: Rect = { x: 0, y: 0, w, h }
	drawCracktroScene(ctx, screen, player, songName, time)
	drawCracktroFullscreenOverlays(ctx, w, h, time)
}

export function drawCracktroFullscreenOverlays (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	time: number
) {
	ctx.save()

	const pulse = 0.5 + Math.sin(time * 0.006) * 0.5
	ctx.strokeStyle = copperRgb((time * 0.004) % COPPER.length)
	ctx.lineWidth = 4 + pulse * 3
	ctx.strokeRect(6, 6, w - 12, h - 12)

	ctx.lineWidth = 1
	ctx.strokeStyle = copperRgb((time * 0.003 + 4) % COPPER.length)
	ctx.strokeRect(14, 14, w - 28, h - 28)

	const sweepY = (time * 0.08) % h
	ctx.globalAlpha = 0.25
	ctx.fillStyle = copperRgb((time * 0.004) % COPPER.length)
	ctx.fillRect(0, sweepY, w, 6)

	const sweepX = (time * 0.05) % w
	ctx.fillStyle = copperRgb((time * 0.003 + 3) % COPPER.length)
	ctx.fillRect(sweepX, 0, 5, h)
	ctx.globalAlpha = 1

	const debris = ['WAREZ', '1994', 'CRACK', 'DEMOSCENE', 'AMIGA', 'PC', 'XM', 'MOD', 'SCENE', 'INTRO']
	for (let i = 0; i < debris.length; i++) {
		const bx = 80 + (i % 5) * 340 + Math.sin(time * 0.002 + i) * 70
		const by = 60 + Math.floor(i / 5) * 220 + Math.cos(time * 0.003 + i * 2) * 50
		ctx.globalAlpha = 0.5
		drawScaledText(ctx, debris[i], bx, by, 1.8, copperRgb((time * 0.002 + i) % COPPER.length))
	}
	ctx.globalAlpha = 1

	const hint = 'PRESS F8 OR CLICK ANYWHERE TO EXIT'
	ctx.font = BASE_FONT
	const hw = ctx.measureText(hint).width * 1.4
	const hx = w * 0.5 - hw * 0.5 + Math.sin(time * 0.004) * 10
	drawScaledText(ctx, hint, hx, h - 28, 1.4, copperRgb((time * 0.005 + 1) % COPPER.length))

	ctx.restore()
}
