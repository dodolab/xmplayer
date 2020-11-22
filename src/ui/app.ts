
// codepage 128x192, 16x16 -> 8x12px

import XMPlayer, { PlayerState } from '../xmlib/player'
import DragDrop from './dragdrop'
import { XMParser } from '../xmlib/engine/parser';
import { ModFile } from './modfile'

class XMPlayerApp {
	lastTime = 0;
	gameTime = 0;
	player: XMPlayer;
	ctx: CanvasRenderingContext2D;
	canvas: HTMLCanvasElement;
	dragDrop: DragDrop;

	fontSize = 32;
	lettersPerChannel = 14;
	leftBlockLength = 3 + 32;
	markerIndex = 6;
	trackerStartIndex = 0;

	virtualWidth = 1920;
	virtualHeight = 1080;
	currentSong: ModFile;
	modFiles: ModFile[];

	private getParameterByName (name: string): string | null {
		const match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search)
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '))
	}

	init () {
		// load json files
		const request = new XMLHttpRequest()
		request.open('GET', 'assets/files.json', true)
		request.responseType = 'json'

		request.onload = () => {
			this.modFiles = request.response as ModFile[]

			this.canvas = <HTMLCanvasElement>document.getElementById('player')

			this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D

			this.dragDrop = new DragDrop()
			this.dragDrop.init(this.canvas, (file) => this.playSong(file))

			// set fix size and set scale
			this.canvas.height = this.virtualHeight
			this.canvas.width = this.virtualWidth

			this.player = new XMPlayer()
			resizeCanvas(this.canvas, this.virtualWidth, this.virtualHeight)
			this.recalcFonts()
			this.ctx.font = `${this.fontSize}px VGA`

			window.addEventListener('resize', () => {
				resizeCanvas(this.canvas, this.virtualWidth, this.virtualHeight)
				this.recalcFonts()
			})

			const listener = () => {
				let songToPlay = this.modFiles[(Math.floor(Math.random() * this.modFiles.length))]

				if (this.player.state !== PlayerState.PLAYING) {
					const queryStrSong = this.getParameterByName('song')

					if (queryStrSong !== null) {
						const songFile = `${queryStrSong}.xm`
						this.modFiles.forEach((file) => {
							if (file.name.toLowerCase() === songFile.toLowerCase()) {
								songToPlay = file
							}
						})
					}
				}

				this.playSong(songToPlay)
			}

			this.player.onReady = () => {
				this.recalcFonts()
				this.player.play()
			}

			this.player.onPlay = () => {

			}

			this.player.onStop = () => {
				// switch to the next song
				this.playSong(this.modFiles[(Math.floor(Math.random() * this.modFiles.length))])
			}

			document.body.addEventListener('mousedown', listener)
			this.loop(0)
		}
		request.send()
	}

	// load module from url into local buffer
	loadFromUrl (url: string) {
		const request = new XMLHttpRequest()
		request.open('GET', url, true)
		request.responseType = 'arraybuffer'

		request.onload = () => {
			const buffer = new Uint8Array(request.response)
			const xmFile = new XMParser().parse(buffer)
			this.player.load(xmFile)
		}
		request.send()
		return true
	}

	private playSong (modFile: ModFile) {
		this.currentSong = modFile
		if (modFile.path) {
			this.loadFromUrl(modFile.path)
		} else {
			const xmFile = new XMParser().parse(modFile.buffer)
			this.player.load(xmFile)
		}
	}

	private drawString (str: string, posX: number, posY: number, color = 'rgb(255,255,255') {
		this.ctx.fillStyle = color
		this.ctx.fillText(str, this.fontSize + this.fontSize / 2 * posX, this.fontSize + this.fontSize * posY)
	}

	private recalcFonts () {
		const channels = Math.min(6, this.player.channelsNum) // max 6 channels to render
		if (channels) {
			const canvasWidth = this.virtualWidth
			this.fontSize = Math.min(32, 2 * canvasWidth / (channels * this.lettersPerChannel + this.leftBlockLength))
			this.ctx.font = `${this.fontSize}px VGA`
		}
	}

	private loop (time) {
		const dt = (time - this.lastTime)
		this.lastTime = time
		this.gameTime += dt
		// update our own logic
		this.update(dt, this.gameTime)
		requestAnimationFrame((time) => this.loop(time))
	}

	private update (delta: number, absolute: number) {
		this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight)

		if (this.dragDrop.isDragging) {
			this.drawString('DRAGGING', this.virtualWidth / 2, this.virtualHeight / 2)
			return
		}

		if (this.player.state !== PlayerState.PLAYING) {
			const str = 'TOUCH HERE TO PLAY. TOUCH AGAIN TO GO TO THE NEXT SONG'
			const strLength = str.length
			const strWidth = this.virtualWidth / (this.fontSize / 2)
			const strHeight = this.virtualHeight / (this.fontSize)
			this.drawString(str, strWidth / 2 - strLength / 2, strHeight / 2)
			return
		}

		// render song title
		this.drawString('SONG: ' + this.player.title, 0, 0)

		// render instruments
		for (let i = 0; i < this.player.sampleNum; i++) {
			let sampleName = this.player.getSampleName(i)
			if (!sampleName.length) sampleName = '--'
			let isNoteOn = false

			for (let c = 0; c < this.player.channelsNum; c++) {
				const smp = this.player.currentSample(c)
				if (this.player.isNoteOn(c) && smp === i) {
					isNoteOn = true
					break
				}
			}

			this.drawString(sampleName, 0, i + 2, isNoteOn ? 'rgb(0,129,255)' : 'rgb(255,255,255)')
		}

		let pd = ''
		let pp: number
		const pdata = this.player.patternData(this.player.position)

		const channelsToRender = Math.min(6, this.player.channelsNum)

		for (let i = 0; i < (pdata.length / (5 * this.player.channelsNum)); i++) {
			if (i < (this.player.row - this.markerIndex)) {
				continue
			}

			pp = i * 5 * this.player.channelsNum
			pd += hb(i) + '|'
			for (let c = 0; c < channelsToRender; c++) {
				pd += notef(pdata[pp + c * 5 + 0], pdata[pp + c * 5 + 1], pdata[pp + c * 5 + 2], pdata[pp + c * 5 + 3], pdata[pp + c * 5 + 4])
			}
			const isOnMarker = (i === this.player.row)
			this.drawString(pd, 32, this.trackerStartIndex + this.markerIndex + i - this.player.row, isOnMarker ? 'rgb(0, 129, 255)' : 'rgb(255,255,255)')
			pd = ''
		}
	}
}

new XMPlayerApp().init()

const notes = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-']
const volumeCommands = ['m', 'v', '^', '-', '+', 's', '~', 'p', '&lt;', '&gt;'] // 0x5 .. 0xe

// note
// instrument
// volume
// command
// parameter
// channelsnum
function notef (note: number, sample: number, vol: number, command: number, param: number) {
	function pattNote (n) { return (n === 254) ? '===' : `${notes[n & 0x0f]}${((n >> 4))}` }
	function pattVol (v) { return (v <= 0x40) ? hb(v) : (volumeCommands[(v - 0x50) >> 4] + hn(v & 0x0f)) }

	return ((note < 255) ? (pattNote(note) + ' ') : ('... ')) + (sample ? (hb(sample) + ' ') : ('.. ')) +
		((vol !== 255) ? (pattVol(vol) + ' ') : ('.. ')) + ((command !== 0x2e) ? (String.fromCharCode(command) + hb(param)) : '...') + '|'
}

function hn (n: number | undefined) {
	if (typeof n === 'undefined') return '0'
	const s = (n & 0x0f).toString(16)
	return s.toUpperCase()
}

function hb (n: number | undefined) {
	if (typeof n === 'undefined') return '00'
	let s = n.toString(16)
	if (s.length === 1) s = '0' + s
	return s.toUpperCase()
}

function resizeCanvas (canvas: HTMLCanvasElement, virtualWidth: number, virtualHeight: number) {
	let scale: number
	if (window.innerWidth / window.innerHeight > virtualWidth / virtualHeight) {
		scale = window.innerHeight / virtualHeight
	} else {
		scale = window.innerWidth / virtualWidth
	}

	const transform = `scale(${scale})`
	canvas.style.setProperty('MozTransform', transform)
	canvas.style.setProperty('transform', transform)
	canvas.style.setProperty('WebkitTransform', transform)
	canvas.style.setProperty('top', `${((scale - 1) * virtualHeight / 2)}px`)
	canvas.style.setProperty('left', `${((scale - 1) * virtualWidth / 2 + (window.innerWidth - virtualWidth * scale) / 2)}px`)
}
