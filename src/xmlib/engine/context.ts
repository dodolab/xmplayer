import { Sample, Instrument } from './xmfile';


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

    voicePeriodChanged: boolean = false;
    // indicator if the note is enabled
    noteOn: boolean = false;

    // volume slide
    volSlide: number = 0;
    slideSpeed: number = 0;
    slideTo: number = 0;
    slideToSpeed: number = 0;
    // arpeggio value taken from effect param, format (octave|note)
    arpeggio: number = 0;
    
    // period for portamento effect
    period: number = 640;

    volume: number = 64;
    voicePeriod: number = 0;
    voiceVolume: number = 0;
    finalVolume: number = 0;

    vibratoSpeed: number = 0
    vibratoDepth: number = 0
    vibratoPos: number = 0;
    vibratoWave: number = 0;

    volEnvPos: number = 0;
    panEnvPos: number = 0;
    // current position for volume fade out 
    fadeOutPos: number = 0;

    // playing direction, float in range <-1,1>
    playDir: number = 1;

    // interpolation/ramps
    volRamp: number = 0;
    volRampFrom: number = 0;
    trigRamp: number = 0;
    trigRampFrom: number = 0.0;
    // current sample waveform value
    currentSample: number = 0.0;
    lastSample: number = 0.0;
    oldFinalVolume: number = 0.0;

    slideUpSpeed: number = 0;
    slideDownSpeed: number = 0;

    pan: number = 0.5;
    // final panning that considers also envelope
    finalPan: number = 0.5; 
}


// local flags, 8 not used
export const XM_FLAG_NEW_TICK = 1;
export const XM_FLAG_NEW_ROW = 2;
export const XM_FLAG_RECALC_SPEED = 3; // new row + tick = recalc speed
export const XM_FLAG_NEW_PATTERN = 4;

// global flags, 32 not used
export const XM_FLAG_PATTERN_JUMP = 16;
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

    amigaPeriods = false; // TODO copy from XMFile !!
}