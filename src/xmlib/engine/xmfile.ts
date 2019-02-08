export class Sample {

    // number of bits per sample (8/16)
    bits: number = 8;
    
    bps: number = 1;
    data: Float32Array = null;
    fineTune: number = 0;
    length: number = 0;
    loopEnd: number = 0;
    loopLength: number = 0;
    loopStart: number = 0;
    loopType: number = 0;
    name: string = "";
    panning: number = 128;
    relativeNote: number = 0;
    stereo: number = 0;
    volume: number = 64;
}

export class Instrument {
    name: string = ""; // instrument name 
    headerLength: number = 0;
    sampleHeaderLength: number = 0;

    samples: Array<Sample> = new Array<Sample>();
    sampleMap: Uint8Array =  new Uint8Array(96);
    sampleCount: number = 0; 

    // vibrato
    vibratoDepth: number = 0;
    vibratoRate: number = 0;
    vibratoSweep: number = 0;
    vibratoType: number = 0;

    // volume envelope
    volEnvelope: Float32Array = new Float32Array(325); 
    volEnvLength: number = 0; // number of volume points
    volSustain: number = 0; // volume sustaion point
    volLoopStart: number = 0; // volume loop start point
    volLoopEnd: number = 0; // volume loop end point
    volFlags: number = 0; // 1=enabled, 2=sustain, 4=loop
    volFadeout: number = 0; // volume fade out

    // pan envelope
    panEnvelope: Float32Array = new Float32Array(325); // pan envelope
    panEnvLength: number = 0; // number of panning points
    panSustain: number = 0; // panning sustain point
    panLoopEnd: number = 0; // panning loop end point
    panLoopStart: number = 0; // panning loop start point
    panFlags: number = 0; // 1=enabled, 2=sustain, 4=loop
}

export class XMFile {
    signature: string = "";
    trackerVersion: number = null;
    title: string = "";
    headerLength: number = 0; // length of the header
    songLength: number = 0; // song length in patterns
    repeatPos: number = 0; // restart position
    channelsNum: number = 0; // number of channels
    patternsNum: number = 0; // number of patterns (<256)
    instrumentsNum: number = 0; // number of instruments (<128)
    amigaPeriods: boolean = false;
    initSpeed: number = 0; // default tempo
    initBPM: number = 0; // default BPM
    patternOrderTable : Array<number>;
    patterns: Array<Uint8Array> = null; // patterns, ordered according to the patterntable
    patternLength: Array<number> = null; // length of every pattern (number of rows) at appropriate index
    instruments: Array<Instrument> = null;
}