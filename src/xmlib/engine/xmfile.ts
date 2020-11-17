/**
 * Structure for samples
 */
export class Sample {
	// number of bits per sample (8/16)
	bits = 8;
	// beats per second, TODO not used
	bps = 1;
	data: Float32Array = null;
	// fineTune = -128..+127 (-128 = -1 halftone, +127 = +127/128 halftones)
	fineTune = 0;
	// length of the sample in number of beats
	length = 0;
	loopEnd = 0;
	loopLength = 0;
	loopStart = 0;
	loopType = 0;
	name = '';
	panning = 128;
	// relativeTone = -96..95 (0 => C-4)
	relativeNote = 0;
	volume = 64;
}

/**
 * Structure for instruments
 */
export class Instrument {
	name = ''; // instrument name
	headerLength = 0;
	sampleHeaderLength = 0;

	samples: Array<Sample> = new Array<Sample>();
	// note to sample index mapper
	sampleMap: Uint8Array = new Uint8Array(96);
	samplesNum = 0;

	// vibrato
	vibratoDepth = 0;
	vibratoRate = 0;
	vibratoSweep = 0;
	vibratoType = 0;

	// volume envelope
	volEnvelope: Float32Array = new Float32Array(325);
	// number of volume points
	volEnvLength = 0;
	// volume sustaion point
	volSustain = 0;
	// volume loop start point
	volLoopStart = 0;
	// volume loop end point
	volLoopEnd = 0;
	// 1=enabled, 2=sustain, 4=loop
	volFlags = 0;
	// volume fade out
	volFadeout = 0;

	// pan envelope
	panEnvelope: Float32Array = new Float32Array(325);
	// number of panning points
	panEnvLength = 0;
	// panning sustain point
	panSustain = 0;
	// panning loop end point
	panLoopEnd = 0;
	// panning loop start point
	panLoopStart = 0;
	// 1=enabled, 2=sustain, 4=loop
	panFlags = 0;
}

/**
 * XMFile structure
 */
export class XMFile {
	title = '';
	headerLength = 0;
	// song length in number of patterns
	songLength = 0;
	// TODO not used
	repeatPos = 0;
	// up to 32 channels
	channelsNum = 0;
	// up to 256 patterns
	patternsNum = 0;
	// up to 128 instruments
	instrumentsNum = 0;
	// if true, amiga periods will be used (it really makes difference in sound!)
	amigaPeriods = false;
	// default tempo
	initSpeed = 0;
	initBPM = 0;
	// ordering table for patterns
	patternOrderTable: Array<number>;
	// patterns, ordered by pattern table
	patterns: Array<Uint8Array> = null;
	// length of every pattern (number of rows) at appropriate index
	patternLength: Array<number> = null;
	instruments: Array<Instrument> = null;
}
