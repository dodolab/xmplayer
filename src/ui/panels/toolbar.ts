import type { Rect } from '../layout'
import type XMPlayer from '../../xmlib/player'
import { PlayerState } from '../../xmlib/player'
import { drawTextButton, drawToggle, drawHSlider, hSliderHit, type ButtonState } from '../widgets'

export type ToolbarHit =
	| 'play'
	| 'pause'
	| 'stop'
	| 'prev'
	| 'next'
	| 'shuffle'
	| 'repeat'
	| 'patloop'
	| 'interp'
	| 'cracktro'
	| 'speed'
	| 'bpm'
	| null

export type ToolbarLayout = {
	rects: Record<string, Rect>
	speedSlider: Rect
	bpmSlider: Rect
}

export function layoutToolbar (toolbar: Rect): ToolbarLayout {
	const row1y = toolbar.y + 8
	const row1h = Math.min(36, toolbar.h * 0.38)
	const gap = 6
	let x = toolbar.x + 8
	const rects: Record<string, Rect> = {}
	const place = (id: string, w: number) => {
		rects[id] = { x, y: row1y, w, h: row1h }
		x += w + gap
	}
	// place the buttons
	place('play', 56)
	place('pause', 56)
	place('stop', 56)
	place('prev', 56)
	place('next', 56)

	const row2y = row1y + row1h + 8
	const row2h = Math.min(30, toolbar.h - row2y + toolbar.y - 8)
	let x2 = toolbar.x + 8
	const row2 = (id: string, w: number) => {
		rects[id] = { x: x2, y: row2y, w, h: row2h }
		x2 += w + gap
	}
	row2('shuffle', 100)
	row2('repeat', 100)
	row2('patloop', 110)
	row2('interp', 110)
	row2('cracktro', 110)

	const row3y = row2y + row2h + 8
	const row3h = Math.max(24, toolbar.y + toolbar.h - row3y - 6)
	const speedSlider: Rect = { x: toolbar.x + 8, y: row3y, w: 300, h: row3h }
	const bpmSlider: Rect = { x: toolbar.x + 320, y: row3y, w: 300, h: row3h }

	return { rects, speedSlider, bpmSlider }
}

export function drawToolbar (
	ctx: CanvasRenderingContext2D,
	L: ToolbarLayout,
	player: XMPlayer,
	hoverId: string | null,
	pressedId: string | null,
	uiShuffle: boolean,
	songRepeat: boolean,
	patLoop: boolean,
	interp: boolean,
	cracktro: boolean,
	_sortModeLabel?: string,
	cracktroTime = 0
) {
	const st = (id: string): ButtonState => ({
		hover: hoverId === id,
		pressed: pressedId === id
	})

	const font = (r: Rect) => Math.min(15, r.h * 0.42)

	const drawBtn = (id: string, label: string) => {
		const r = L.rects[id]
		if (r) drawTextButton(ctx, r, label, st(id), font(r))
	}

	drawBtn('play', 'Play')
	drawBtn('pause', 'Pause')
	drawBtn('stop', 'Stop')
	drawBtn('prev', '<Ord')
	drawBtn('next', 'Ord>')

	// ASCII logo drawn before toggles so buttons stay on top and clickable
	const logo = [
		' ____   ___  ____   ___  ____  _                  ',
		'|  _ \\ / _ \\|  _ \\ / _ \\|  _ \\| | __ _ _   _  ___ _ __',
		'| | | | | | | | | | | | | |_) | |/ _` | | | |/ _ \\ \'__|',
		'| |_| | |_| | |_| | |_| |  __/| | (_| | |_| |  __/ |',
		'|____/ \\___/|____/ \\___/|_|   |_|\\__,_|\\__, |\\___|_|',
		'                                        |___/'
	]
	ctx.font = '10px VGA'
	ctx.textBaseline = 'top'
	const logoY = L.rects.play.y + 2
	const maxLogoW = logo.reduce((m, line) => Math.max(m, ctx.measureText(line).width), 0)
	const logoX = 960 - maxLogoW * 0.5
	for (let i = 0; i < logo.length; i++) {
		const line = logo[i]
		const ox = cracktro ? Math.sin(cracktroTime * 0.003 + i * 0.8) * 4 : 0
		if (cracktro) {
			const hue = (cracktroTime * 0.05 + i * 40 + 120) % 360
			ctx.fillStyle = `hsl(${hue}, 90%, 65%)`
		} else {
			ctx.fillStyle = 'rgb(120,180,220)'
		}
		ctx.fillText(line, logoX + ox, logoY + i * 10)
	}

	drawToggle(ctx, L.rects.shuffle, 'Shuffle', uiShuffle, st('shuffle'), font(L.rects.shuffle))
	drawToggle(ctx, L.rects.repeat, 'Loop song', songRepeat, st('repeat'), font(L.rects.repeat))
	drawToggle(ctx, L.rects.patloop, 'Loop pattern', patLoop, st('patloop'), font(L.rects.patloop))
	drawToggle(ctx, L.rects.interp, 'Interpol', interp, st('interp'), font(L.rects.interp))
	drawToggle(ctx, L.rects.cracktro, 'CRACKTRO', cracktro, st('cracktro'), font(L.rects.cracktro))
	if (cracktro) {
		const cr = L.rects.cracktro
		ctx.strokeStyle = 'rgb(255,200,0)'
		ctx.lineWidth = 2
		ctx.strokeRect(Math.floor(cr.x), Math.floor(cr.y), Math.floor(cr.w), Math.floor(cr.h))
		ctx.lineWidth = 1
	}

	const spd = player.currentSpeed || 6
	const bpm = player.currentBpm || 125
	drawHSlider(ctx, L.speedSlider, `Speed ${spd}`, (spd - 1) / 30, font(L.speedSlider))
	drawHSlider(ctx, L.bpmSlider, `BPM ${bpm}`, (bpm - 32) / (255 - 32), font(L.bpmSlider))

	ctx.fillStyle = 'rgb(160,160,180)'
	ctx.font = `${Math.min(14, font(L.speedSlider))}px VGA`
	ctx.textBaseline = 'top'
	const stt = player.state
	const stName =
		stt === PlayerState.PLAYING ? 'PLAYING' :
			stt === PlayerState.PAUSED ? 'PAUSED' :
				stt === PlayerState.READY ? 'READY' :
					stt === PlayerState.STOPPED ? 'STOPPED' : 'NONE'
	ctx.fillText(`State: ${stName}  |  Keys: Space F5 F6 F8 cracktro Arrows [ ] 1-0 mute`, L.bpmSlider.x + L.bpmSlider.w + 12, L.speedSlider.y + 20)
}

export function hitToolbar (x: number, y: number, L: ToolbarLayout): ToolbarHit {
	for (const id of ['play', 'pause', 'stop', 'prev', 'next', 'shuffle', 'repeat', 'patloop', 'interp', 'cracktro']) {
		const r = L.rects[id]
		if (r && x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return id as ToolbarHit
	}
	if (hSliderHit(L.speedSlider, x, y, true) !== null || contains(L.speedSlider, x, y)) return 'speed'
	if (hSliderHit(L.bpmSlider, x, y, true) !== null || contains(L.bpmSlider, x, y)) return 'bpm'
	return null
}

function contains (r: Rect, x: number, y: number) {
	return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
}

export function toolbarSliderValue (id: 'speed' | 'bpm', x: number, y: number, L: ToolbarLayout): number | null {
	const r = id === 'speed' ? L.speedSlider : L.bpmSlider
	return hSliderHit(r, x, y, true)
}
