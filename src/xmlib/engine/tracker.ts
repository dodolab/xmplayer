import { XMFile } from './xmfile'
import { XMContext, Channel, XM_FLAG_NEW_TICK, XM_FLAG_NEW_ROW, XM_FLAG_LOOP_PATTERN, XM_FLAG_PATTERN_JUMP, XM_FLAG_NEW_PATTERN } from './context'
import { SoundProcessor } from './processor'
import { Mixer } from './mixer'

/**
 * Tracker for advancing the song
 */
export default class Tracker {
	xmFile: XMFile = null;
	context: XMContext = null;
	processor: SoundProcessor = new SoundProcessor();
	mixer: Mixer = new Mixer();

	initialize (xmFile: XMFile, sampleRate: number) {
		this.xmFile = xmFile

		this.context = new XMContext()
		this.context.sampleRate = sampleRate

		// take values from xmFile if not zero
		if (this.xmFile.initSpeed != 0) this.context.currentSpeed = this.xmFile.initSpeed
		if (this.xmFile.initBPM != 0) this.context.currentBpm = this.xmFile.initBPM

		this.context.amigaPeriods = this.xmFile.amigaPeriods

		// create channel table
		for (let i = 0; i < this.xmFile.channelsNum; i++) {
			this.context.channels[i] = new Channel()
		}

		this.processor.initialize(this.context, this.xmFile)
		this.mixer.initialize(this.context, this.xmFile)
	}

	public repeat () {
		this.context.position = 0
		this.context.endOfSong = false
	}

	public mix (buffers: Float32Array[], bufferLength: number) {
		// fill audiobuffer
		for (let s = 0; s < bufferLength; s++) {
			// if STT has run out, step player forward by tick
			if (this.context.spd <= 0) {
				this.advance()
				this.processor.processTick()
			}

			this.mixer.mix(buffers, s)
			this.context.spd--
		}
	}

	// advances player by a tick
	private advance () {
		// 125 BPM is the default MilkyTracker settings that gives 50 Hz
		this.context.spd = Math.floor((125.0 / this.context.currentBpm) * (this.context.sampleRate / 50.0)) // 50Hz

		this.context.tick++
		this.context.flags |= XM_FLAG_NEW_TICK

		// new row on this tick?
		if (this.context.tick >= this.context.currentSpeed) {
			if (this.context.patternDelay) { // delay pattern
				if (this.context.tick < ((this.context.patternWait + 1) * this.context.currentSpeed)) {
					this.context.patternWait++
				} else {
					this.context.row++
					this.context.tick = 0
					this.context.flags |= XM_FLAG_NEW_ROW
					this.context.patternDelay = 0
				}
			} else {
				if (this.context.flags & 0x70) { // 0111 0000 -> check if there is a global flag set
					if (this.context.flags & XM_FLAG_LOOP_PATTERN) {
						this.context.row = this.context.loopRow
						this.context.flags &= 0xa1 // 1010 0001 -> keep next tick, pattern jump and loop pattern
						this.context.flags |= 2
					} else if (this.context.flags & XM_FLAG_PATTERN_JUMP) { // pattern jump/break?
						this.context.position = this.context.patternJump
						this.context.row = this.context.breakRow
						this.context.patternJump = 0
						this.context.breakRow = 0
						this.context.flags &= 0xa1 // 1110 0001 -> keep next tick, pattern jump and loop pattern
						this.context.flags |= XM_FLAG_NEW_ROW
					}

					this.context.tick = 0
				} else {
					this.context.row++
					this.context.tick = 0
					this.context.flags |= XM_FLAG_NEW_ROW
				}
			}
		}

		// step to new pattern?
		if (this.context.row >= this.xmFile.patternLength[this.xmFile.patternOrderTable[this.context.position]]) {
			this.context.position++
			this.context.row = 0
			this.context.flags |= XM_FLAG_NEW_PATTERN
		}

		// end of song?
		if (this.context.position >= this.xmFile.songLength) {
			this.context.endOfSong = true
		}
	}
}
