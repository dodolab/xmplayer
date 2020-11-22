import { XMFile } from './engine/xmfile'
import Tracker from './engine/tracker'
import { XMParser } from './engine/parser'
import { XM_FLAG_RECALC_SPEED } from './engine/context'

export enum PlayerState {
	READY,
	PLAYING,
	PAUSED,
	STOPPED,
	NONE
}

export enum StereoSepMode {
	STANDARD,
	MIX,
	MONO
}

export default class XMPlayer {
	private _state: PlayerState = PlayerState.NONE;

	private repeat = false;
	private amiga500 = true; // amiga filter
	private autostart = false;
	private audioInitialized = false;
	private sepMode: StereoSepMode = StereoSepMode.STANDARD;

	// initial delay
	private initDelay = 0;

	onReady: () => void;
	onPlay: () => void;
	onStop: () => void;

	private mixerNode: ScriptProcessorNode;
	private lowpassNode: BiquadFilterNode;
	private filterNode: BiquadFilterNode;
	private currentFile: XMFile;

	private sampleRate: number;

	// format-specific player
	private tracker = new Tracker();

	get state () {
		return this._state
	}

	get title () {
		return this.currentFile ? this.currentFile.title : ''
	}

	get songLength () {
		return this.currentFile ? this.currentFile.songLength : 0
	}

	get channelsNum () {
		return this.currentFile ? this.currentFile.channelsNum : 0
	}

	get patternsNum () {
		return this.currentFile ? this.currentFile.patternsNum : 0
	}

	get endOfSong () {
		return this.tracker.context.endOfSong
	}

	get row () {
		return this.tracker.context.row
	}

	get position () {
		return this.tracker.context.position
	}

	get currentSpeed () {
		return this.tracker.context.currentSpeed
	}

	get currentBpm () {
		return this.tracker.context.currentBpm
	}

	get sampleNum () {
		return this.currentFile.instruments.length
	}

	getSampleName (index: number): string {
		return this.currentFile.instruments.length <= index ? '' : this.currentFile.instruments[index].name
	}

	load (file: XMFile) {
		this.currentFile = file
		// copy static data from player
		this.tracker.initialize(this.currentFile, this.sampleRate)
		this._state = PlayerState.READY
		this.onReady()
		if (this.autostart) {
			this.play()
		}
	}

	// play loaded and parsed module with webaudio context
	play (): boolean {
		if (this._state === PlayerState.NONE) {
			return false
		}

		if (this._state === PlayerState.PAUSED) {
			this._state = PlayerState.PLAYING
			return true
		}

		if (!this.audioInitialized) {
			this.initAudio()
		}

		this.tracker.initialize(this.currentFile, this.sampleRate)
		this._state = PlayerState.PLAYING
		this.onPlay()

		this.initDelay = 4
		return true
	}

	// pause playback
	pause () {
		if (this._state === PlayerState.PAUSED) {
			this._state = PlayerState.PLAYING
		} else if (this.state === PlayerState.PLAYING) {
			this._state = PlayerState.PAUSED
		}
	}

	// stop playback
	stop (callCallback = true) {
		this._state = PlayerState.STOPPED
		if (callCallback) {
			this.onStop()
		}
	}

	// jump positions forward/back
	jump (step: number) {
		this.tracker.context.tick = 0
		this.tracker.context.row = 0
		this.tracker.context.position += step
		this.tracker.context.flags = XM_FLAG_RECALC_SPEED
		if (this.tracker.context.position < 0) this.tracker.context.position = 0
		if (this.tracker.context.position >= this.songLength) {
			this.stop()
		}
	}

	// set whether module repeats after songlen
	setRepeat (rep: boolean) {
		this.repeat = rep
		if (this.tracker) this.repeat = rep
	}

	// set stereo separation mode (0=standard, 1=65/35 mix, 2=mono)
	setSeparation (mode: StereoSepMode) {
		this.sepMode = mode
	}

	// set autostart to play immediately after loading
	setAutoStart (autostart: boolean) {
		this.autostart = autostart
	}

	// set amiga model - changes lowpass filter state
	// TODO won't work if called without audio init
	setAmiga500 (amiga500: boolean) {
		this.amiga500 = amiga500
		if (amiga500) {
			if (this.filterNode) {
				this.filterNode.frequency.value = 6000
			}
		} else {
			if (this.filterNode) {
				this.filterNode.frequency.value = 22050
			}
		}
	}

	// ger current pattern number
	currentPattern (): number {
		if (this.tracker) return this.currentFile.patternOrderTable[this.tracker.context.position]
		return 0
	}

	// check if a channel has a note on
	isNoteOn (ch: number): boolean {
		if (ch >= this.channelsNum) return false
		return this.tracker.context.channels[ch].noteOn
	}

	// get currently active sample on channel
	currentSample (ch: number): number {
		if (ch >= this.channelsNum) return 0
		return this.tracker.context.channels[ch].instrumentIndex
	}

	// get current pattern in standard unpacked format (note, sample, volume, command, data) for visualisation
	// note: 254=noteoff, 255=no note
	// sample: 0=no instrument, 1..255=sample number
	// volume: 255=no volume set, 0..64=set volume, 65..239=ft2 volume commands
	// command: 0x2e=no command, 0..0x24=effect command
	// data: 0..255
	patternData (pn: number): Uint8Array {
		const xmFile = this.currentFile
		const patt = new Uint8Array(xmFile.patterns[xmFile.patternOrderTable[pn]])
		for (let i = 0; i < xmFile.patternLength[pn]; i++) {
			for (let c = 0; c < xmFile.channelsNum; c++) {
				if (patt[i * 5 * xmFile.channelsNum + c * 5 + 0] < 97) { patt[i * 5 * xmFile.channelsNum + c * 5 + 0] = (patt[i * 5 * xmFile.channelsNum + c * 5 + 0] % 12) | (Math.floor(patt[i * 5 * xmFile.channelsNum + c * 5 + 0] / 12) << 4) }
				if (patt[i * 5 * xmFile.channelsNum + c * 5 + 3] === 255) patt[i * 5 * xmFile.channelsNum + c * 5 + 3] = 0x2e
				else {
					if (patt[i * 5 * xmFile.channelsNum + c * 5 + 3] < 0x0a) {
						patt[i * 5 * xmFile.channelsNum + c * 5 + 3] += 0x30
					} else {
						patt[i * 5 * xmFile.channelsNum + c * 5 + 3] += 0x41 - 0x0a
					}
				}
			}
		}
		return patt
	}

	// get length of currently playing pattern
	currentPatterLength (): number {
		return this.currentFile.patternLength[this.currentFile.patternOrderTable[this.tracker.context.position]]
	}

	// create the web audio context
	private initAudio () {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		const context = new ((<any>window).AudioContext || (<any>window).webkitAudioContext)() as AudioContext
		this.sampleRate = context.sampleRate

		// Amiga 500 fixed filter at 6kHz. WebAudio lowpass is 12dB/oct, whereas
		// older Amigas had a 6dB/oct filter at 4900Hz.
		this.filterNode = context.createBiquadFilter()

		this.setAmiga500(this.amiga500)

		// "LED filter" at 3275kHz - off by default
		// TODO can be removed
		this.lowpassNode = context.createBiquadFilter()
		this.lowpassNode.frequency.value = 28867

		// mixer
		const bufferlen = (this.sampleRate > 44100) ? 4096 : 2048
		if (typeof (context as any).createJavaScriptNode === 'function') {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			this.mixerNode = (context as any).createJavaScriptNode(bufferlen, 1, 2) as ScriptProcessorNode
		} else {
			this.mixerNode = context.createScriptProcessor(bufferlen, 1, 2)
		}

		this.mixerNode.onaudioprocess = (ape: AudioProcessingEvent) => { this.audioLoop(ape) }

		// patch up some cables :)
		this.mixerNode.connect(this.filterNode)
		this.filterNode.connect(this.lowpassNode)
		this.lowpassNode.connect(context.destination)
		this.audioInitialized = true
	}

	// scriptnode callback - pass through to player class
	private audioLoop (ape: AudioProcessingEvent) {
		// stereo buffer
		const bufs = [ape.outputBuffer.getChannelData(0), ape.outputBuffer.getChannelData(1)]
		const buflen = ape.outputBuffer.length

		if (this.initDelay === 0) {
			// return a buffer of silence if not playing
			if (this.state !== PlayerState.PLAYING || this.endOfSong) {
				// todo set only once!
				for (let s = 0; s < buflen; s++) {
					bufs[0][s] = 0.0
					bufs[1][s] = 0.0
				}
			} else {
				this.tracker.mix(bufs, buflen)
			}

			this.applySeparation(bufs, buflen)

			if (this.tracker.context.endOfSong && this.repeat) {
				this.tracker.repeat()
			} else if (this.tracker.context.endOfSong && this.state === PlayerState.PLAYING) { this.stop() }
		} else {
			// delay.. anyway, return silent buffer (TODO refactor this)
			for (let s = 0; s < buflen; s++) {
				bufs[0][s] = 0.0
				bufs[1][s] = 0.0
			}
		}

		if (this.initDelay > 0) { this.initDelay-- }
	}

	private applySeparation (bufs: Float32Array[], buflen: number) {
		// apply stereo separation and soft clipping
		const outp = new Float32Array(2)

		// scale down a bit
		const mixVal = 4.0 - 2.0 * (this.channelsNum / 32.0)

		for (let s = 0; s < buflen; s++) {
			outp[0] = bufs[0][s]
			outp[1] = bufs[1][s]

			// a more headphone-friendly stereo separation
			if (this.sepMode !== StereoSepMode.STANDARD) {
				const t = outp[0]
				if (this.sepMode === StereoSepMode.MONO) { // mono
					outp[0] = outp[0] * 0.5 + outp[1] * 0.5
					outp[1] = outp[1] * 0.5 + t * 0.5
				} else { // narrow stereo
					outp[0] = outp[0] * 0.65 + outp[1] * 0.35
					outp[1] = outp[1] * 0.65 + t * 0.35
				}
			}

			// scale down and soft clip
			outp[0] /= mixVal
			outp[0] = 0.5 * (Math.abs(outp[0] + 0.975) - Math.abs(outp[0] - 0.975))
			outp[1] /= mixVal
			outp[1] = 0.5 * (Math.abs(outp[1] + 0.975) - Math.abs(outp[1] - 0.975))

			bufs[0][s] = outp[0]
			bufs[1][s] = outp[1]
		}
	}
}
