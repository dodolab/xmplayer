import { XMContext, Channel } from './context'
import { XMFile } from './xmfile'

export class Mixer {
	context: XMContext = null;
	xmFile: XMFile = null;

	// stereo output
	outputLeft: number;
	outputRight: number;

	public initialize (context: XMContext, xmFile: XMFile) {
		this.context = context
		this.xmFile = xmFile
	}

	public mix (buffers: Float32Array[], buffOffset: number) {
		this.outputLeft = 0.0
		this.outputRight = 0.0

		// mix channels
		for (let ch = 0; ch < this.xmFile.channelsNum; ch++) {
			const channel = this.context.channels[ch]
			const instrument = channel.instrument

			// add channel output to left/right master outputs
			if (channel.noteOn ||
				((instrument.volFlags & 1) && !channel.noteOn && channel.fadeOutPos) ||
				(!channel.noteOn && channel.volRamp < 1.0)
			) {
				const sampleData = this.mixSample(channel)
				this.advanceSample(channel, sampleData)
			} else {
				channel.currentSample = 0.0 // note is completely off
			}
		}

		// done - store to output buffer
		const volume = this.context.volume / 64.0
		buffers[0][buffOffset] = this.outputLeft * volume
		buffers[1][buffOffset] = this.outputRight * volume
	}

	private mixSample (channel: Channel): number {
		let sampleData = 0.0
		let sampleOutput1 = 0.0
		let sampleOutput2 = 0.0

		const sample = channel.sample

		if (sample.length > channel.samplePos) {
			// interpolate towards current sample
			let samplePos = Math.floor(channel.samplePos)
			sampleData = sample.data[samplePos]
			samplePos = channel.samplePos - samplePos
			samplePos = (channel.playDir < 0) ? (1.0 - samplePos) : samplePos
			sampleOutput1 = samplePos * sampleData + (1.0 - samplePos) * channel.lastSample

			// smooth out discontinuities from retrig and sample offset
			let trigRamp = channel.trigRamp
			sampleOutput1 = trigRamp * sampleOutput1 + (1.0 - trigRamp) * channel.trigRampFrom
			trigRamp += 1.0 / 128.0
			channel.trigRamp = Math.min(1.0, trigRamp)
			channel.currentSample = sampleOutput1

			// ramp volume changes over 64 samples to avoid clicks
			sampleOutput2 = sampleOutput1 * (channel.finalVolume / 64.0)

			let volRamp = channel.volRamp
			sampleOutput1 = volRamp * sampleOutput2 + (1.0 - volRamp) * (sampleOutput1 * (channel.volRampFrom / 64.0))
			volRamp += (1.0 / 64.0)
			channel.volRamp = Math.min(1.0, volRamp)

			// pan samples, if envelope is disabled panvenv is always 0.5
			volRamp = channel.finalPan
			sampleOutput2 = sampleOutput1 * volRamp
			sampleOutput1 *= 1.0 - volRamp
		}
		this.outputLeft += sampleOutput1
		this.outputRight += sampleOutput2
		return sampleData
	}

	private advanceSample (channel: Channel, sampleData: number) {
		const sample = channel.sample
		// advance sample position and check for loop or end
		const oldpos = channel.samplePos
		channel.samplePos += channel.playDir * channel.sampleSpeed
		if (channel.playDir == 1) {
			if (Math.floor(channel.samplePos) > Math.floor(oldpos)) channel.lastSample = sampleData
		} else {
			if (Math.floor(channel.samplePos) < Math.floor(oldpos)) channel.lastSample = sampleData
		}

		if (sample.loopType) {
			if (sample.loopType == 2) {
				// pingpong loop (when we are playing one part of a sample back and forth)
				if (channel.playDir == -1) {
					// bounce off from start?
					if (channel.samplePos <= sample.loopStart) {
						channel.samplePos += (sample.loopStart - channel.samplePos)
						channel.playDir = 1
						channel.lastSample = channel.currentSample
					}
				} else {
					// bounce off from end?
					if (channel.samplePos >= sample.loopEnd) {
						channel.samplePos -= (channel.samplePos - sample.loopEnd)
						channel.playDir = -1
						channel.lastSample = channel.currentSample
					}
				}
			} else {
				// normal loop
				if (channel.samplePos >= sample.loopEnd) {
					channel.samplePos -= sample.loopLength
					channel.lastSample = channel.currentSample
				}
			}
		}
	}
}
