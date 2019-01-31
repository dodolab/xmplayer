// Channel + all context structures

// helping class that holds values for a current channel
// used for playing and for applying effects
class Channel {
    instrumentIndex = 0;
    sampleIndex = 0;

    note = 36;
    command = 0;
    param = 0; // parameter of the command
    samplePos = 0; // current position of a sample, is not integer!
    sampleSpeed = 0;

    // 1 = voice period has changed, set within effects
    // 3 = recalc speed
    flags = 0;
    noteOn = 0;

    volSlide: number = 0;
    slideSpeed: number = 0;
    slideTo: number = 0;
    slideToSpeed: number = 0;
    arpeggio: number = 0;

    period: number = 640;
    frequency: number = 8363;

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
    fadeOutPos: number = 0;

    playDir: number = 1;

    // interpolation/ramps
    volRamp: number = 0;
    volRampFrom: number = 0;
    trigRamp: number = 0;
    trigRampFrom: number = 0.0;
    currentSample: number = 0.0;
    lastSample: number = 0.0;
    oldFinalVolume: number = 0.0;

    // those two variables can be set only within the Effects object
    slideUpSpeed: number = 0;
    slideDownSpeed: number = 0;
}

class XMContext {
    pan = new Float32Array(32);
    finalPan = new Float32Array(32); // final panning that considers also envelope

    // ============ public vars ================
    tick = 0;
    position = 0;
    row = 0;
    endOfSong = false;
    // ========================================

    // 1 = 
    // 2 = new row
    // 3 = recalc speed
    // 4 = new pattern
    // 16 = pattern jump/break, global flag
    // 32 - global flag
    // 64 = loop pattern
    flags = 0;
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
    channels: Channel[] = null;
    sampleRate: number;
}
