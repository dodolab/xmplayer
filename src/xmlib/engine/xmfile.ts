/**
 * Structure for samples
 */
export class Sample {
    // number of bits per sample (8/16)
    bits: number = 8;
    // beats per second, TODO not used
    bps: number = 1;
    data: Float32Array = null;
    // fineTune = -128..+127 (-128 = -1 halftone, +127 = +127/128 halftones)
    fineTune: number = 0;
    // length of the sample in number of beats
    length: number = 0;
    loopEnd: number = 0;
    loopLength: number = 0;
    loopStart: number = 0;
    loopType: number = 0;
    name: string = "";
    panning: number = 128;
    // relativeTone = -96..95 (0 => C-4)
    relativeNote: number = 0;
    volume: number = 64;
}

/**
 * Structure for instruments
 */
export class Instrument {
    name: string = ""; // instrument name 
    headerLength: number = 0;
    sampleHeaderLength: number = 0;

    samples: Array<Sample> = new Array<Sample>();
    // note to sample index mapper
    sampleMap: Uint8Array =  new Uint8Array(96);
    sampleCount: number = 0; 

    // vibrato
    vibratoDepth: number = 0;
    vibratoRate: number = 0;
    vibratoSweep: number = 0;
    vibratoType: number = 0;

    // volume envelope
    volEnvelope: Float32Array = new Float32Array(325); 
     // number of volume points
    volEnvLength: number = 0;
    // volume sustaion point
    volSustain: number = 0; 
    // volume loop start point
    volLoopStart: number = 0;
    // volume loop end point
    volLoopEnd: number = 0;
    // 1=enabled, 2=sustain, 4=loop
    volFlags: number = 0;
    // volume fade out
    volFadeout: number = 0;

    // pan envelope
    panEnvelope: Float32Array = new Float32Array(325);
    // number of panning points
    panEnvLength: number = 0;
    // panning sustain point
    panSustain: number = 0;
    // panning loop end point
    panLoopEnd: number = 0;
    // panning loop start point
    panLoopStart: number = 0;
    // 1=enabled, 2=sustain, 4=loop
    panFlags: number = 0;
}

/**
 * XMFile structure
 */
export class XMFile {
    title: string = "";
    headerLength: number = 0;
    // song length in number of patterns 
    songLength: number = 0;
    // TODO not used
    repeatPos: number = 0; 
    // up to 32 channels
    channelsNum: number = 0; 
    // up to 256 patterns
    patternsNum: number = 0;
    // up to 128 instruments
    instrumentsNum: number = 0; 
    // if true, amiga periods will be used (it really makes difference in sound!)
    amigaPeriods: boolean = false;
    // default tempo
    initSpeed: number = 0;
    initBPM: number = 0;
    // ordering table for patterns
    patternOrderTable : Array<number>;
    // patterns, ordered by pattern table
    patterns: Array<Uint8Array> = null; 
    // length of every pattern (number of rows) at appropriate index
    patternLength: Array<number> = null; 
    instruments: Array<Instrument> = null;
}