import { XMContext, XM_FLAG_NEW_ROW } from './context'
import { XMFile } from './xmfile'
import { calcPeriod } from './utils'
import Effects from './effects'

/**
 * Sound processing engine
 */
export class SoundProcessor {
	effects: Effects = new Effects();
	context: XMContext = null;
	xmFile: XMFile = null;

	public initialize (context: XMContext, xmFile: XMFile) {
		this.context = context
		this.xmFile = xmFile
	}

	/**
	 * Advances all channels by one tick
	 */
	public processTick () {
		for (let ch = 0; ch < this.xmFile.channelsNum; ch++) {
			const channel = this.context.channels[ch]
			// calculate playback position
			const patternDataOffset = 5 * (this.context.row * this.xmFile.channelsNum + ch)
			const patternIndex = this.xmFile.patternOrderTable[this.context.position]

			const volume = this.xmFile.patterns[patternIndex][patternDataOffset + 2]

			// save old volume if ramping is needed
			channel.oldFinalVolume = channel.finalVolume

			if (this.context.flags & XM_FLAG_NEW_ROW) {
				// new row on this tick -> store command
				const command = this.xmFile.patterns[patternIndex][patternDataOffset + 3]
				const param = this.xmFile.patterns[patternIndex][patternDataOffset + 4]
				channel.command = command
				channel.param = param
				// if not note delay effect, process note
				if (!(command == 0x0e && (param & 0xf0) == 0xd0)) {
					this.processNote(patternIndex, ch)
				}
			}

			const instrument = channel.instrument

			// kill empty instruments
			if (channel.noteOn && !instrument.samplesNum) {
				channel.noteOn = false
			}

			const firstTick = this.context.tick == 0

			// volume >=0x50 is an index into volume effect table
			if (volume >= 0x50 && volume < 0xf0) {
				// first effect takes place at 0x50, we need to get the first 4bits and rescale it in order
				// to start at [0x00] as the volume effects are stored in an array
				this.effects.voleffects[(volume >> 4) - 5](firstTick, channel, this.context, this.effects, volume & 0x0f)
			}

			if (channel.command < 0x24) {
				// e-effects are distinguished in effect_t0_e based on player.data
				this.effects.effects[channel.command](firstTick, channel, this.context, this.effects)
			}

			// recalc sample speed if voiceperiod has changed
			if ((channel.voicePeriodChanged || this.context.flags & XM_FLAG_NEW_ROW) && channel.voicePeriod != 0) {
				let frequency: number
				// xmp plays Protracker and Fast Tracker II modules at standard PAL rate of
				// 7093789.2 / (428 * 2) = 8287.137 for middle C
				if (this.context.amigaPeriods) {
					frequency = 8287.137 * 1712.0 / channel.voicePeriod
				} else {
					frequency = 8287.137 * Math.pow(2.0, (4608.0 - channel.voicePeriod) / 768.0)
				}
				channel.sampleSpeed = frequency / this.context.sampleRate
			}

			// advance vibrato on each new tick
			channel.vibratoPos += channel.vibratoSpeed
			channel.vibratoPos &= 0x3f // 0011 1111

			// advance volume envelope, if enabled (also fadeout)
			if (instrument.volFlags & 1) {
				channel.volEnvPos++

				if (channel.noteOn && (instrument.volFlags & 2) && channel.volEnvPos >= instrument.volSustain) {
					channel.volEnvPos = instrument.volSustain
				}

				if ((instrument.volFlags & 4) && channel.volEnvPos >= instrument.volLoopEnd) {
					channel.volEnvPos = instrument.volLoopStart
				}

				if (channel.volEnvPos >= instrument.volEnvLength) {
					channel.volEnvPos = instrument.volEnvLength
				}

				channel.volEnvPos = Math.min(324, channel.volEnvPos)

				// fadeout if note is off
				if (!channel.noteOn && channel.fadeOutPos) {
					channel.fadeOutPos = Math.max(0, channel.fadeOutPos - instrument.volFadeout)
				}
			}

			// advance pan envelope, if enabled
			if (instrument.panFlags & 1) {
				channel.panEnvPos++

				if (channel.noteOn && instrument.panFlags & 2 && channel.panEnvPos >= instrument.panSustain) {
					channel.panEnvPos = instrument.panSustain
				}

				if (instrument.panFlags & 4 && channel.panEnvPos >= instrument.panLoopEnd) {
					channel.panEnvPos = instrument.panLoopStart
				}

				if (channel.panEnvPos >= instrument.panEnvLength) {
					channel.panEnvPos = instrument.panEnvLength
				}

				channel.panEnvPos = Math.min(324, channel.panEnvPos)
			}

			// calc final volume for channel
			channel.finalVolume = channel.voiceVolume * instrument.volEnvelope[channel.volEnvPos] * channel.fadeOutPos / 65536.0

			// calc final panning for channel
			channel.finalPan = channel.pan + (instrument.panEnvelope[channel.panEnvPos] - 0.5) * (0.5 * Math.abs(channel.pan - 0.5)) * 2.0

			// setup volramp if voice volume changed
			if (channel.oldFinalVolume != channel.finalVolume) {
				channel.volRampFrom = channel.oldFinalVolume
				channel.volRamp = 0.0
			}

			// clear channel flags
			channel.voicePeriodChanged = false
		}

		// clear global flags after all channels are processed
		this.context.flags &= 0x70 // 64 + 32 + 16
	}

	// process one channel on a row in pattern p, pp is an offset to pattern data
	private processNote (patternIndex: number, ch: number) {
		// 5 data values: (note, instrument, volume, command and parameter)
		// data is stored in the pattern table sequentially: row1 channel 1, row1 channel 2,..., row2 channel1,..
		const patternDataOffset = 5 * (this.context.row * this.xmFile.channelsNum + ch)
		const pattern = this.xmFile.patterns[patternIndex]
		const note = pattern[patternDataOffset]
		// instrument index will be non-0 only for the very beginning of the pattern
		const instrumentOnRowIndex = pattern[patternDataOffset + 1] - 1
		let instrumentIndex = instrumentOnRowIndex
		let sampleIndex: number
		const channel = this.context.channels[ch]

		// index is -1 if the instrument is undefined
		if (instrumentOnRowIndex != -1 && instrumentOnRowIndex < this.xmFile.instruments.length) {
			// save instrument index into channel entity for later use
			channel.instrumentIndex = instrumentOnRowIndex
			const instrument = this.xmFile.instruments[instrumentOnRowIndex]

			if (instrument.samplesNum != 0) {
				// save sample data and panning
				sampleIndex = instrument.sampleMap[channel.note]
				channel.sampleIndex = sampleIndex
				const sample = instrument.samples[sampleIndex]
				channel.sample = sample
				channel.volume = sample.volume
				channel.playDir = 1 // fixes bug for several music files :-D
				channel.pan = sample.panning / 255.0
			}
			channel.voiceVolume = channel.volume
		} else {
			// take the index from previous rows
			instrumentIndex = channel.instrumentIndex
		}

		const instrument = this.xmFile.instruments[instrumentIndex]
		channel.instrument = instrument

		// 0xFE is note off, 0xFF is no note
		if (note == 0xFE) { // this is our special value for arpeggio effect with 0 value in order to save performance
			channel.noteOn = false // note off
			if (!(instrument.volFlags & 1)) channel.voiceVolume = 0
		} else if (note < 0xFE) {
			sampleIndex = instrument.sampleMap[note]
			channel.sampleIndex = sampleIndex
			const sample = instrument.samples[sampleIndex]
			channel.sample = sample
			const relativeNote = note + sample.relativeNote

			// calc period for note
			const period = calcPeriod(relativeNote, sample.fineTune, this.xmFile.amigaPeriods)

			// porta to note, porta + volslide
			const isPorta = ((channel.command != 0x03) && (channel.command != 0x05))

			if (isPorta) {
				channel.note = note
				channel.period = period
				channel.voicePeriod = channel.period
			}

			// restart values for porta if playing and for the beginning of the row if not playing
			if ((channel.noteOn && isPorta) || (!channel.noteOn && instrumentOnRowIndex != -1)) {
				channel.samplePos = 0
				channel.playDir = 1

				if (channel.vibratoWave > 3) {
					channel.vibratoPos = 0
				}

				channel.noteOn = true
				channel.fadeOutPos = 65535
				channel.volEnvPos = 0
				channel.panEnvPos = 0
				channel.trigRamp = 0.0
				channel.trigRampFrom = channel.currentSample
			}

			// set the slide to note target to note period
			// TODO if no porta and note on, what is this good for??? Check! Perhaps Effect3 is executed automagically!
			channel.slideTo = period
		}

		// can be null before the first note is played
		if (channel.sample == null) {
			channel.sample = channel.instrument.samples[channel.sampleIndex]
		}

		const volume = pattern[patternDataOffset + 2]
		if (volume <= 0x40) {
			// set volume (values are in range 0x00-0x40)
			channel.volume = volume
			channel.voiceVolume = channel.volume
		}
	}
}
