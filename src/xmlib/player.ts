import { XMFile } from './engine/xmfile'
import Tracker from './engine/tracker'
import { XMParser } from './engine/parser'
import { XM_FLAG_RECALC_SPEED } from './engine/context'
import { decodePatternToDisplayBuffer } from './engine/patternDecode'

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
	private analyserNode: AnalyserNode;
	private currentFile: XMFile;
	private analyserData: Uint8Array;
	private sampleRate: number;

	// format-specific player
	private tracker = new Tracker();

	private pendingSeek: { order: number; row: number } | null = null;

	/** UI-owned playback options reapplied each audio buffer */
	public readonly channelMuted: boolean[] = [];
	public readonly channelGain: number[] = [];
	public soloChannelIndex = -1;
	public userPatternLoop = false;
	public interpolation = true;

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
		return this.tracker.context?.endOfSong ?? false
	}

	get row () {
		return this.tracker.context?.row ?? 0
	}

	get position () {
		return this.tracker.context?.position ?? 0
	}

	get currentSpeed () {
		const ctx = this.tracker.context
		if (!ctx) return 6
		return ctx.currentSpeed || 6
	}

	get currentBpm () {
		const ctx = this.tracker.context
		if (!ctx) return 125
		return ctx.currentBpm || 125
	}

	get sampleNum () {
		return this.currentFile ? this.currentFile.instruments.length : 0
	}

	get loadedModule (): XMFile | null {
		return this.currentFile ?? null
	}

	get analyserBinCount (): number {
		return this.audioInitialized ? this.analyserData.length : 256
	}

	get patternOrderTable (): number[] {
		return this.currentFile ? [...this.currentFile.patternOrderTable] : []
	}

	firstOrderWithPattern (patternIndex: number): number {
		if (!this.currentFile) return 0
		for (let i = 0; i < this.currentFile.songLength; i++) {
			if (this.currentFile.patternOrderTable[i] === patternIndex) return i
		}
		return 0
	}

	getSampleName (index: number): string {
		if (!this.currentFile) return ''
		return this.currentFile.instruments.length <= index ? '' : this.currentFile.instruments[index].name
	}

	load (file: XMFile) {
		this.currentFile = file
		this.initChannelUiState()
		// copy static data from player
		this.tracker.initialize(this.currentFile, this.sampleRate)
		this.applyUserPlaybackFlags()
		this._state = PlayerState.READY
		this.onReady()
		if (this.autostart) {
			this.play()
		}
	}

	private initChannelUiState () {
		const n = this.currentFile ? this.currentFile.channelsNum : 0
		this.channelMuted.length = 0
		this.channelGain.length = 0
		for (let i = 0; i < n; i++) {
			this.channelMuted.push(false)
			this.channelGain.push(1)
		}
	}

	private applyUserPlaybackFlags () {
		if (this.tracker.context) {
			this.tracker.context.userPatternLoop = this.userPatternLoop
		}
		this.tracker.mixer.interpolationEnabled = this.interpolation
		this.tracker.mixer.soloChannel = this.soloChannelIndex
		for (let i = 0; i < this.channelsNum; i++) {
			this.tracker.mixer.setChannelMuted(i, !!this.channelMuted[i])
			this.tracker.mixer.setChannelGain(i, this.channelGain[i] ?? 1)
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
		this.applyUserPlaybackFlags()
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
		if (!this.tracker.context) return
		this.pendingSeek = null
		this.tracker.context.tick = 0
		this.tracker.context.row = 0
		this.tracker.context.position += step
		this.tracker.context.flags = XM_FLAG_RECALC_SPEED
		if (this.tracker.context.position < 0) this.tracker.context.position = 0
		if (this.tracker.context.position >= this.songLength) {
			this.stop()
		}
	}

	seekToOrderRow (orderIndex: number, row: number) {
		if (!this.currentFile || orderIndex < 0) return
		if (orderIndex >= this.songLength) return
		const pat = this.currentFile.patternOrderTable[orderIndex]
		const maxRow = this.currentFile.patternLength[pat] - 1
		const r = Math.max(0, Math.min(row, maxRow))
		this.pendingSeek = { order: orderIndex, row: r }
	}

	setSpeed (v: number) {
		const n = Math.max(1, Math.min(255, Math.floor(v)))
		if (this.tracker.context) this.tracker.context.currentSpeed = n
	}

	setBpm (v: number) {
		const n = Math.max(32, Math.min(255, Math.floor(v)))
		if (this.tracker.context) this.tracker.context.currentBpm = n
	}

	setUserPatternLoop (on: boolean) {
		this.userPatternLoop = on
		if (this.tracker.context) this.tracker.context.userPatternLoop = on
	}

	setInterpolation (on: boolean) {
		this.interpolation = on
		this.tracker.mixer.interpolationEnabled = on
	}

	setChannelMuted (ch: number, muted: boolean) {
		if (ch < 0 || ch >= this.channelMuted.length) return
		this.channelMuted[ch] = muted
		this.tracker.mixer.setChannelMuted(ch, muted)
	}

	toggleChannelMute (ch: number) {
		if (ch < 0 || ch >= this.channelMuted.length) return
		this.setChannelMuted(ch, !this.channelMuted[ch])
	}

	setSoloChannel (ch: number | null) {
		this.soloChannelIndex = ch === null ? -1 : ch
		this.tracker.mixer.soloChannel = this.soloChannelIndex
	}

	setChannelUiGain (ch: number, linear: number) {
		if (ch < 0 || ch >= this.channelGain.length) return
		const g = Math.max(0, Math.min(2, linear))
		this.channelGain[ch] = g
		this.tracker.mixer.setChannelGain(ch, g)
	}

	copyScopeRing (ch: number, out: Float32Array): number {
		return this.tracker.mixer.readScopeRing(ch, out)
	}

	getVuPeak (ch: number): number {
		return ch >= 0 && ch < 32 ? this.tracker.mixer.vuPeak[ch] : 0
	}

	getChannelFinalPan (ch: number): number {
		const ctx = this.tracker.context
		if (!ctx?.channels[ch]) return 0.5
		return ctx.channels[ch].finalPan
	}

	// set whether module repeats after songlen
	setRepeat (rep: boolean) {
		this.repeat = rep
	}

	get songRepeating (): boolean {
		return this.repeat
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
		if (!this.currentFile || !this.tracker.context) return 0
		return this.currentFile.patternOrderTable[this.tracker.context.position]
	}

	// check if a channel has a note on
	isNoteOn (ch: number): boolean {
		if (ch >= this.channelsNum || !this.tracker.context) return false
		return this.tracker.context.channels[ch].noteOn
	}

	isNoteOnForInstrument (instrumentIndex: number): boolean {
		for (let c = 0; c < this.channelsNum; c++) {
			if (this.isNoteOn(c) && this.currentSample(c) === instrumentIndex) return true
		}
		return false
	}

	// get currently active sample on channel
	currentSample (ch: number): number {
		if (ch >= this.channelsNum || !this.tracker.context) return 0
		return this.tracker.context.channels[ch].instrumentIndex
	}

	// get current pattern in standard unpacked format (note, sample, volume, command, data) for visualisation
	// note: 254=noteoff, 255=no note
	// sample: 0=no instrument, 1..255=sample number
	// volume: 255=no volume set, 0..64=set volume, 65..239=ft2 volume commands
	// command: 0x2e=no command, 0..0x24=effect command
	// data: 0..255
	patternData (orderIndex: number): Uint8Array {
		const xmFile = this.currentFile
		const patIdx = xmFile.patternOrderTable[orderIndex]
		const raw = xmFile.patterns[patIdx]
		const rows = xmFile.patternLength[patIdx]
		return decodePatternToDisplayBuffer(raw, xmFile.channelsNum, rows)
	}

	frequencyData (): Uint8Array {
		if (!this.audioInitialized) {
			return new Uint8Array(256)
		}
		this.analyserNode.getByteFrequencyData(this.analyserData)
		return this.analyserData
	}

	// get length of currently playing pattern
	currentPatterLength (): number {
		if (!this.currentFile || !this.tracker.context) return 0
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
		this.analyserNode = context.createAnalyser()
		this.analyserNode.fftSize = 512
		this.analyserData = new Uint8Array(this.analyserNode.frequencyBinCount)

		// patch up some cables :)
		this.mixerNode.connect(this.filterNode)
		this.filterNode.connect(this.lowpassNode)
		this.lowpassNode.connect(this.analyserNode)
		this.analyserNode.connect(context.destination)
		this.audioInitialized = true
	}

	// scriptnode callback - pass through to player class
	private audioLoop (ape: AudioProcessingEvent) {
		// stereo buffer
		const bufs = [ape.outputBuffer.getChannelData(0), ape.outputBuffer.getChannelData(1)]
		const buflen = ape.outputBuffer.length

		if (this.initDelay === 0) {
			if (this.pendingSeek) {
				const { order, row } = this.pendingSeek
				this.pendingSeek = null
				const xc = this.tracker.context
				if (xc && this.currentFile && order >= 0 && order < this.songLength) {
					xc.position = order
					xc.row = row
					xc.tick = 0
					xc.endOfSong = false
					xc.flags = XM_FLAG_RECALC_SPEED
				}
			}
			this.applyUserPlaybackFlags()
			// return a buffer of silence if not playing
			if (this.state !== PlayerState.PLAYING || this.endOfSong) {
				// todo set only once!
				for (let s = 0; s < buflen; s++) {
					bufs[0][s] = 0.0
					bufs[1][s] = 0.0
				}
			} else {
				this.tracker.mixer.startAudioBuffer()
				this.tracker.mix(bufs, buflen)
			}

			this.applySeparation(bufs, buflen)

			const xc = this.tracker.context
			if (xc?.endOfSong && this.repeat) {
				this.tracker.repeat()
			} else if (xc?.endOfSong && this.state === PlayerState.PLAYING) { this.stop() }
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
