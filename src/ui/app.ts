// codepage 128x192, 16x16 -> 8x12px

import XMPlayer, { PlayerState } from '../xmlib/player'
import DragDrop from './dragdrop'
import { XMParser } from '../xmlib/engine/parser'
import { ModFile } from './modfile'
import { computePanels, contains, type Rect } from './layout'
import { clientToVirtual } from './input'
import { drawPanelChrome } from './widgets'
import {
	layoutToolbar,
	drawToolbar,
	hitToolbar,
	toolbarSliderValue,
	type ToolbarLayout
} from './panels/toolbar'
import {
	defaultPatternState,
	layoutPatternMetrics,
	drawPatternPanel,
	patternPanelWheel,
	hitPattern,
	hitChannelGainStrip,
	channelGainFromClickY,
	type PatternPanelState
} from './panels/pattern'
import {
	buildDisplayList,
	cycleSortMode,
	drawPlaylist,
	hitPlaylist,
	hitPlaylistControl,
	type PlaylistControlHit,
	type SortMode
} from './panels/playlist'
import { drawVisualizerPanel, hitOrderList } from './panels/visualizer'
import { drawInstrumentList, drawInstrumentPanel, hitInstrumentList } from './panels/instrument'
import { attachKeyboard } from './keyboard'

const virtualWidth = 1920
const virtualHeight = 1080

class XMPlayerApp {
	lastTime = 0
	gameTime = 0
	player = new XMPlayer()
	ctx!: CanvasRenderingContext2D
	canvas!: HTMLCanvasElement
	dragDrop = new DragDrop()

	modFiles: ModFile[] = []
	displayFiles: ModFile[] = []
	sortMode: SortMode = 'orig'
	currentFileIndex = 0
	private fileInput!: HTMLInputElement

	private panels = computePanels(virtualWidth, virtualHeight)
	private toolbarLayout: ToolbarLayout = layoutToolbar(this.panels.toolbar)
	private patternState: PatternPanelState = defaultPatternState()

	private mx = 0
	private my = 0
	private hoverHit: string | null = null
	private pressedHit: string | null = null
	private hoverPlaylistControl: PlaylistControlHit | null = null
	private pressedPlaylistControl: PlaylistControlHit | null = null
	private dragSlider: 'speed' | 'bpm' | null = null
	private adjustingGainCh: number | null = null

	private playlistScroll = 0
	private orderScroll = 0
	private selectedInst = 0
	private sampleSubIndex = 0
	private shuffleNext = false
	private pendingAutoPlay = false

	private getParameterByName (name: string): string | null {
		const match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search)
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '))
	}

	init () {
		const request = new XMLHttpRequest()
		request.open('GET', 'assets/files.json', true)
		request.responseType = 'json'

		request.onload = () => {
			this.modFiles = request.response as ModFile[]
			this.displayFiles = buildDisplayList(this.modFiles, this.sortMode)

			this.canvas = document.getElementById('player') as HTMLCanvasElement
			this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D

			this.fileInput = document.createElement('input')
			this.fileInput.type = 'file'
			this.fileInput.accept = '.xm,.XM'
			this.fileInput.style.display = 'none'
			this.fileInput.addEventListener('change', () => {
				const f = this.fileInput.files?.[0]
				if (f) this.dragDrop.loadFile(f)
			})
			document.body.appendChild(this.fileInput)

			this.dragDrop.init(this.canvas, (file) => this.loadModFile(file, true))

			this.canvas.height = virtualHeight
			this.canvas.width = virtualWidth
			resizeCanvas(this.canvas, virtualWidth, virtualHeight)
			this.ctx.font = '16px VGA'

			window.addEventListener('resize', () => {
				resizeCanvas(this.canvas, virtualWidth, virtualHeight)
			})

			this.player.onReady = () => {
				this.patternState.scrollX = 0
				this.applyShuffleRepeatToPlayer()
				if (this.pendingAutoPlay) {
					this.pendingAutoPlay = false
					this.player.play()
				}
			}

			this.player.onPlay = () => {}

			this.player.onStop = () => {
				this.advanceAfterSongEnd()
			}

			this.wireCanvasInput()
			attachKeyboard({
				player: this.player,
				onPrevOrder: () => this.player.jump(-1),
				onNextOrder: () => this.player.jump(1),
				onBpmDelta: (d) => this.player.setBpm(this.player.currentBpm + d),
				onSpeedDelta: (d) => this.player.setSpeed(this.player.currentSpeed + d)
			})

			this.pickInitialSong()
			requestAnimationFrame((t) => this.loop(t))
		}
		request.send()
	}

	private pickInitialSong () {
		let songToPlay = this.displayFiles[0]
		if (this.player.state !== PlayerState.PLAYING) {
			const queryStrSong = this.getParameterByName('song')
			if (queryStrSong !== null) {
				const songFile = `${queryStrSong}.xm`
				const hit = this.displayFiles.find((f) => f.name.toLowerCase() === songFile.toLowerCase())
				if (hit) songToPlay = hit
			}
		}
		this.currentFileIndex = Math.max(0, this.displayFiles.indexOf(songToPlay))
		this.loadModFile(songToPlay, false)
	}

	private wireCanvasInput () {
		this.canvas.addEventListener('mousemove', (e) => {
			const p = clientToVirtual(e.clientX, e.clientY, this.canvas, virtualWidth, virtualHeight)
			this.mx = p.x
			this.my = p.y
			if (this.adjustingGainCh !== null && (e.buttons & 1)) {
				const g = channelGainFromClickY(this.panels.pattern, this.my, this.player, this.adjustingGainCh)
				this.player.setChannelUiGain(this.adjustingGainCh, g)
			}
			if (this.dragSlider === 'speed') {
				const v = toolbarSliderValue('speed', this.mx, this.my, this.toolbarLayout)
				if (v !== null) this.player.setSpeed(1 + Math.round(v * 30))
			} else if (this.dragSlider === 'bpm') {
				const v = toolbarSliderValue('bpm', this.mx, this.my, this.toolbarLayout)
				if (v !== null) this.player.setBpm(32 + Math.round(v * (255 - 32)))
			}
			this.hoverPlaylistControl = hitPlaylistControl(this.panels.playlist, this.mx, this.my)
		})
		this.canvas.addEventListener('mousedown', (e) => {
			const p = clientToVirtual(e.clientX, e.clientY, this.canvas, virtualWidth, virtualHeight)
			this.mx = p.x
			this.my = p.y
			this.onMouseDown(p.x, p.y, e.altKey)
		})
		this.canvas.addEventListener('mouseup', () => {
			this.pressedHit = null
			this.pressedPlaylistControl = null
			this.dragSlider = null
			this.adjustingGainCh = null
		})
		this.canvas.addEventListener('mouseleave', () => {
			this.dragSlider = null
			this.hoverHit = null
			this.hoverPlaylistControl = null
			this.pressedPlaylistControl = null
			this.adjustingGainCh = null
		})
		this.canvas.addEventListener('wheel', (e) => {
			e.preventDefault()
			const p = clientToVirtual(e.clientX, e.clientY, this.canvas, virtualWidth, virtualHeight)
			const dy = e.deltaY > 0 ? 1 : -1
			if (contains(this.panels.pattern, p.x, p.y)) {
				patternPanelWheel(this.panels.pattern, this.patternState, dy, this.player.channelsNum)
			} else if (contains(this.panels.playlist, p.x, p.y)) {
				this.playlistScroll = Math.max(0, this.playlistScroll + dy * 2)
			} else if (contains(this.panels.visualizer, p.x, p.y)) {
				const ordW = Math.min(140, this.panels.visualizer.w * 0.28)
				if (p.x < this.panels.visualizer.x + ordW) {
					this.orderScroll = Math.max(0, this.orderScroll + dy * 2)
				}
			}
		}, { passive: false })
	}

	private onMouseDown (x: number, y: number, altKey: boolean) {
		const tb = hitToolbar(x, y, this.toolbarLayout)
		this.pressedHit = tb
		this.pressedPlaylistControl = hitPlaylistControl(this.panels.playlist, x, y)
		if (tb === 'speed') this.dragSlider = 'speed'
		if (tb === 'bpm') this.dragSlider = 'bpm'

		if (tb === 'play') this.player.play()
		if (tb === 'pause') this.player.pause()
		if (tb === 'stop') this.player.stop(false)
		if (tb === 'prev') this.player.jump(-1)
		if (tb === 'next') this.player.jump(1)
		const plc = this.pressedPlaylistControl
		if (plc === 'open') this.fileInput.click()
		if (plc === 'sort') {
			this.sortMode = cycleSortMode(this.sortMode)
			this.displayFiles = buildDisplayList(this.modFiles, this.sortMode)
			this.currentFileIndex = Math.min(this.currentFileIndex, this.displayFiles.length - 1)
		}
		if (tb === 'shuffle') this.shuffleNext = !this.shuffleNext
		if (tb === 'repeat') this.player.setRepeat(!this.player.songRepeating)
		if (tb === 'patloop') this.player.setUserPatternLoop(!this.player.userPatternLoop)
		if (tb === 'interp') this.player.setInterpolation(!this.player.interpolation)

		if (tb === 'speed') {
			const v = toolbarSliderValue('speed', x, y, this.toolbarLayout)
			if (v !== null) this.player.setSpeed(1 + Math.round(v * 30))
		}
		if (tb === 'bpm') {
			const v = toolbarSliderValue('bpm', x, y, this.toolbarLayout)
			if (v !== null) this.player.setBpm(32 + Math.round(v * (255 - 32)))
		}

		const pl = hitPlaylist(this.panels.playlist, x, y, this.playlistScroll, this.displayFiles)
		if (pl !== null) {
			this.currentFileIndex = pl
			this.loadModFile(this.displayFiles[pl], true)
		}

		const ordHit = hitOrderList(this.panels.visualizer, x, y, this.orderScroll)
		if (ordHit !== null && ordHit < this.player.songLength) {
			this.player.seekToOrderRow(ordHit, 0)
		}

		const xf = this.player.loadedModule
		const rows =
			xf && this.player.channelsNum > 0
				? xf.patternLength[xf.patternOrderTable[this.player.position]]
				: 0
		const gch = hitChannelGainStrip(this.panels.pattern, x, y, this.player)
		if (gch !== null) {
			this.adjustingGainCh = gch
			const g = channelGainFromClickY(this.panels.pattern, y, this.player, gch)
			this.player.setChannelUiGain(gch, g)
		} else {
			const ph = hitPattern(this.panels.pattern, this.player, this.patternState, x, y, rows)
			if (ph?.kind === 'row') this.player.seekToOrderRow(this.player.position, ph.row)
			if (ph?.kind === 'header') {
				if (altKey) this.player.setSoloChannel(this.player.soloChannelIndex === ph.channel ? null : ph.channel)
				else this.player.toggleChannelMute(ph.channel)
			}
		}

		const listR: Rect = {
			x: this.panels.instrument.x,
			y: this.panels.instrument.y,
			w: Math.min(160, this.panels.instrument.w * 0.28),
			h: this.panels.instrument.h
		}
		const ih = hitInstrumentList(listR, x, y, this.player.sampleNum)
		if (ih !== null) {
			this.selectedInst = ih
			this.sampleSubIndex = 0
		}
	}

	private applyShuffleRepeatToPlayer () {
		/* reserved for future auto-shuffle wiring */
	}

	private advanceAfterSongEnd () {
		if (this.displayFiles.length === 0) return
		if (this.shuffleNext || this.sortMode === 'shuffle') {
			this.currentFileIndex = Math.floor(Math.random() * this.displayFiles.length)
		} else {
			this.currentFileIndex = (this.currentFileIndex + 1) % this.displayFiles.length
		}
		this.loadModFile(this.displayFiles[this.currentFileIndex], true)
	}

	loadFromUrl (url: string) {
		const request = new XMLHttpRequest()
		request.open('GET', url, true)
		request.responseType = 'arraybuffer'
		request.onload = () => {
			const buffer = new Uint8Array(request.response as ArrayBuffer)
			const xmFile = new XMParser().parse(buffer)
			this.player.load(xmFile)
		}
		request.send()
		return true
	}

	private loadModFile (modFile: ModFile, autoPlay: boolean) {
		this.pendingAutoPlay = autoPlay
		if (modFile.path) {
			this.loadFromUrl(modFile.path)
		} else {
			const xmFile = new XMParser().parse(modFile.buffer)
			this.player.load(xmFile)
		}
	}

	private loop (time: number) {
		const dt = time - this.lastTime
		this.lastTime = time
		this.gameTime += dt
		this.update(dt, this.gameTime)
		requestAnimationFrame((t) => this.loop(t))
	}

	private update (_delta: number, _absolute: number) {
		this.panels = computePanels(virtualWidth, virtualHeight)
		this.toolbarLayout = layoutToolbar(this.panels.toolbar)
		this.hoverHit = hitToolbar(this.mx, this.my, this.toolbarLayout)

		this.ctx.clearRect(0, 0, virtualWidth, virtualHeight)
		this.ctx.fillStyle = 'rgb(0,0,0)'
		this.ctx.fillRect(0, 0, virtualWidth, virtualHeight)

		drawPanelChrome(this.ctx, this.panels.toolbar, '')
		drawToolbar(
			this.ctx,
			this.toolbarLayout,
			this.player,
			this.hoverHit,
			this.pressedHit,
			this.shuffleNext,
			this.player.songRepeating,
			this.player.userPatternLoop,
			this.player.interpolation,
			''
		)

		drawPanelChrome(this.ctx, this.panels.pattern, '')
		layoutPatternMetrics(this.ctx, this.panels.pattern, this.player.channelsNum, this.patternState)
		const pdata =
			this.player.state !== PlayerState.NONE && this.player.channelsNum > 0
				? this.player.patternData(this.player.position)
				: null
		drawPatternPanel(this.ctx, this.panels.pattern, this.player, this.patternState, pdata)

		drawPanelChrome(this.ctx, this.panels.playlist, '')
		drawPlaylist(
			this.ctx,
			this.panels.playlist,
			this.displayFiles,
			this.currentFileIndex,
			this.playlistScroll,
			this.sortMode,
			this.hoverPlaylistControl,
			this.pressedPlaylistControl
		)

		drawPanelChrome(this.ctx, this.panels.visualizer, '')
		const freq =
			this.player.state === PlayerState.PLAYING ? this.player.frequencyData() : new Uint8Array(this.player.analyserBinCount)
		drawVisualizerPanel(this.ctx, this.panels.visualizer, this.player, freq, this.orderScroll)

		drawPanelChrome(this.ctx, this.panels.instrument, 'Instrument')
		const listR: Rect = {
			x: this.panels.instrument.x + 4,
			y: this.panels.instrument.y + 20,
			w: Math.min(156, this.panels.instrument.w * 0.28),
			h: this.panels.instrument.h - 28
		}
		drawInstrumentList(this.ctx, listR, this.player, this.selectedInst)
		const inst = this.player.loadedModule?.instruments[this.selectedInst] ?? null
		const detail: Rect = {
			x: listR.x + listR.w + 8,
			y: this.panels.instrument.y + 4,
			w: this.panels.instrument.x + this.panels.instrument.w - listR.x - listR.w - 16,
			h: this.panels.instrument.h - 8
		}
		drawInstrumentPanel(this.ctx, detail, inst, this.sampleSubIndex)

	}
}

new XMPlayerApp().init()

function resizeCanvas (canvas: HTMLCanvasElement, virtualW: number, virtualH: number) {
	let scale: number
	if (window.innerWidth / window.innerHeight > virtualW / virtualH) {
		scale = window.innerHeight / virtualH
	} else {
		scale = window.innerWidth / virtualW
	}
	const transform = `scale(${scale})`
	canvas.style.setProperty('MozTransform', transform)
	canvas.style.setProperty('transform', transform)
	canvas.style.setProperty('WebkitTransform', transform)
	canvas.style.setProperty('top', `${((scale - 1) * virtualH) / 2}px`)
	canvas.style.setProperty('left', `${((scale - 1) * virtualW) / 2 + (window.innerWidth - virtualW * scale) / 2}px`)
}
