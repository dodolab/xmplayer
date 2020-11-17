import { Sample, Instrument } from './xmfile'

/**
 * Instant data for every channel
 */
export class Channel {
	// index in the array of instruments
	instrumentIndex = 0;
	// index in the array of samples
	sampleIndex = 0;
	// note value (format octave|note, 0x24 is E4), scale: C|C#|D|D#|E|F|F#|G|G#|A|A#B
	note = 0x24;
	// command index
	command = 0;
	// command param
	param = 0;
	// current position of a playing sample (float -> continuous)
	samplePos = 0;
	// speed of a playing sample
	sampleSpeed = 0;

	sample: Sample = null;
	instrument: Instrument = null;

	voicePeriodChanged = false;
	// indicator if the note is enabled
	noteOn = false;

	// volume slide
	volSlide = 0;
	slideSpeed = 0;
	slideTo = 0;
	slideToSpeed = 0;
	// arpeggio value taken from effect param, format (octave|note)
	arpeggio = 0;

	// period for portamento effect
	period = 640;

	volume = 64;
	voicePeriod = 0;
	voiceVolume = 0;
	finalVolume = 0;

	vibratoSpeed = 0
	vibratoDepth = 0
	vibratoPos = 0;
	// indices of vibrato table (values 0,1,2,3)
	vibratoWave = 0;

	volEnvPos = 0;
	panEnvPos = 0;
	// current position for volume fade out
	fadeOutPos = 0;

	// playing direction, float in range <-1,1>
	playDir = 1;

	// interpolation/ramps
	volRamp = 0;
	volRampFrom = 0;
	trigRamp = 0;
	trigRampFrom = 0.0;
	// current sample waveform value
	currentSample = 0.0;
	lastSample = 0.0;
	oldFinalVolume = 0.0;

	slideUpSpeed = 0;
	slideDownSpeed = 0;

	pan = 0.5;
	// final panning that considers also envelope
	finalPan = 0.5;
}

// local flags, 8 not used
export const XM_FLAG_NEW_TICK = 1
export const XM_FLAG_NEW_ROW = 2
export const XM_FLAG_RECALC_SPEED = 3 // new row + tick = recalc speed
export const XM_FLAG_NEW_PATTERN = 4

// global flags, 32 not used
export const XM_FLAG_PATTERN_JUMP = 16
export const XM_FLAG_LOOP_PATTERN = 64

/**
 * XM player context
 */
export class XMContext {
	// current tick
	tick = -1;
	// position across all patterns
	position = 0;
	// position in current row
	row = 0;
	endOfSong = false;
	// ========================================

	flags = XM_FLAG_RECALC_SPEED;
	volume = 64;

	currentSpeed = 0;
	currentBpm = 0;

	// number of ticks that occur before the pattern advances to the next row
	// beat is 1/4 note -> convention is to use 4 - 6 rows per beat
	spd = 0;
	breakRow = 0; // break row for patternBreak effect
	patternJump = 0;
	patternDelay = 0;
	patternWait = 0;

	loopRow = 0;
	loopStart = 0;
	loopCount = 0;

	globalVolSlide = 0;
	channels: Channel[] = [];
	sampleRate: number;

	amigaPeriods = false;
}
