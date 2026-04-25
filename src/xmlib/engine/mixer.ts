import { XMContext, Channel } from './context'
import { XMFile } from './xmfile'

const MAX_CH = 32
const SCOPE_LEN = 256

export class Mixer {
	context: XMContext;
	xmFile: XMFile;

	interpolationEnabled = true;

	private readonly channelMuted = new Array<boolean>(MAX_CH).fill(false)
	private readonly channelGain = new Float32Array(MAX_CH)
	soloChannel = -1

	private scopeRings: Float32Array[] = []
	private scopeWriteCount = new Int32Array(MAX_CH)
	readonly vuPeak = new Float32Array(MAX_CH)

	constructor () {
		for (let i = 0; i < MAX_CH; i++) {
			this.channelGain[i] = 1.0
			this.scopeRings[i] = new Float32Array(SCOPE_LEN)
		}
	}

	public initialize (context: XMContext, xmFile: XMFile) {
		this.context = context
		this.xmFile = xmFile
		this.interpolationEnabled = true
		this.soloChannel = -1
		for (let i = 0; i < MAX_CH; i++) {
			this.channelMuted[i] = false
			this.channelGain[i] = 1.0
			this.scopeWriteCount[i] = 0
			this.vuPeak[i] = 0
			this.scopeRings[i].fill(0)
		}
	}

	public setChannelMuted (ch: number, muted: boolean) {
		if (ch >= 0 && ch < MAX_CH) this.channelMuted[ch] = muted
	}

	public getChannelMuted (ch: number): boolean {
		return ch >= 0 && ch < MAX_CH ? this.channelMuted[ch] : false
	}

	public setChannelGain (ch: number, g: number) {
		if (ch >= 0 && ch < MAX_CH) this.channelGain[ch] = g
	}

	public getChannelGain (ch: number): number {
		return ch >= 0 && ch < MAX_CH ? this.channelGain[ch] : 1
	}

	public startAudioBuffer () {
		for (let i = 0; i < MAX_CH; i++) {
			this.vuPeak[i] = 0
		}
	}

	/** Oldest → newest in out[0..SCOPE_LEN-1] */
	public readScopeRing (ch: number, out: Float32Array): number {
		if (ch < 0 || ch >= MAX_CH) return 0
		const ring = this.scopeRings[ch]
		const cnt = this.scopeWriteCount[ch]
		for (let i = 0; i < SCOPE_LEN; i++) {
			if (cnt < SCOPE_LEN) {
				out[i] = i < cnt ? ring[i] : 0
			} else {
				const idx = (cnt - SCOPE_LEN + i) % SCOPE_LEN
				out[i] = ring[idx]
			}
		}
		return SCOPE_LEN
	}

	private pushScope (ch: number, v: number) {
		const c = this.scopeWriteCount[ch]
		this.scopeRings[ch][c % SCOPE_LEN] = v
		this.scopeWriteCount[ch] = c + 1
	}

	public mix (buffers: Float32Array[], buffOffset: number) {
		let outL = 0.0
		let outR = 0.0

		for (let ch = 0; ch < this.xmFile.channelsNum; ch++) {
			const channel = this.context.channels[ch]
			const instrument = channel.instrument

			if (channel.noteOn ||
				((instrument && instrument.volFlags & 1) && !channel.noteOn && channel.fadeOutPos) ||
				(!channel.noteOn && channel.volRamp < 1.0)
			) {
				const sampleData = this.mixSample(channel)
				this.pushScope(ch, channel.currentSample)
				const vu = Math.abs(channel.currentSample) * (channel.finalVolume / 64.0)
				if (vu > this.vuPeak[ch]) this.vuPeak[ch] = vu

				let g = this.channelGain[ch]
				if (this.channelMuted[ch]) g = 0
				if (this.soloChannel >= 0 && ch !== this.soloChannel) g = 0

				const pl = this.partialLeft * g
				const pr = this.partialRight * g
				outL += pl
				outR += pr

				this.advanceSample(channel, sampleData)
			} else {
				channel.currentSample = 0.0
				this.pushScope(ch, 0)
			}
		}

		const volume = this.context.volume / 64.0
		buffers[0][buffOffset] = outL * volume
		buffers[1][buffOffset] = outR * volume
	}

	private partialLeft = 0
	private partialRight = 0

	private mixSample (channel: Channel): number {
		let sampleData = 0.0
		let sampleOutput1 = 0.0
		let sampleOutput2 = 0.0

		const sample = channel.sample
		this.partialLeft = 0
		this.partialRight = 0

		if (sample && sample.length > channel.samplePos) {
			const i0 = Math.floor(channel.samplePos)
			sampleData = sample.data[i0]

			if (this.interpolationEnabled) {
				let frac = channel.samplePos - i0
				frac = (channel.playDir < 0) ? (1.0 - frac) : frac
				sampleOutput1 = frac * sampleData + (1.0 - frac) * channel.lastSample
			} else {
				sampleOutput1 = sampleData
			}

			let trigRamp = channel.trigRamp
			sampleOutput1 = trigRamp * sampleOutput1 + (1.0 - trigRamp) * channel.trigRampFrom
			trigRamp += 1.0 / 128.0
			channel.trigRamp = Math.min(1.0, trigRamp)
			channel.currentSample = sampleOutput1

			sampleOutput2 = sampleOutput1 * (channel.finalVolume / 64.0)

			let volRamp = channel.volRamp
			sampleOutput1 = volRamp * sampleOutput2 + (1.0 - volRamp) * (sampleOutput1 * (channel.volRampFrom / 64.0))
			volRamp += (1.0 / 64.0)
			channel.volRamp = Math.min(1.0, volRamp)

			const pan = channel.finalPan
			sampleOutput2 = sampleOutput1 * pan
			sampleOutput1 *= 1.0 - pan

			this.partialLeft = sampleOutput1
			this.partialRight = sampleOutput2
		}
		return sampleData
	}

	private advanceSample (channel: Channel, sampleData: number) {
		const sample = channel.sample
		const oldpos = channel.samplePos
		channel.samplePos += channel.playDir * channel.sampleSpeed
		if (channel.playDir === 1) {
			if (Math.floor(channel.samplePos) > Math.floor(oldpos)) channel.lastSample = sampleData
		} else {
			if (Math.floor(channel.samplePos) < Math.floor(oldpos)) channel.lastSample = sampleData
		}

		if (sample && sample.loopType) {
			if (sample.loopType === 2) {
				if (channel.playDir === -1) {
					if (channel.samplePos <= sample.loopStart) {
						channel.samplePos += (sample.loopStart - channel.samplePos)
						channel.playDir = 1
						channel.lastSample = channel.currentSample
					}
				} else {
					if (channel.samplePos >= sample.loopEnd) {
						channel.samplePos -= (channel.samplePos - sample.loopEnd)
						channel.playDir = -1
						channel.lastSample = channel.currentSample
					}
				}
			} else {
				if (channel.samplePos >= sample.loopEnd) {
					channel.samplePos -= sample.loopLength
					channel.lastSample = channel.currentSample
				}
			}
		}
	}
}
