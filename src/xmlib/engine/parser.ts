import { XMFile, Sample, Instrument } from './xmfile';
/**
 * XMFile parser
 */
export class XMParser {

    private currentOffset = 0;

    // parse the module from local buffer
    public parse(buffer: Uint8Array): XMFile {

        this.currentOffset = 0x3c; // data starts at 0x3c

        let file = new XMFile();
        this.parseHeader(buffer, file);
        this.parsePatterns(buffer, file);
        this.parseInstruments(buffer, file);

        return file;
    }

    private parseHeader(buffer: Uint8Array, file: XMFile) {

        // check xm signature, type and tracker version
        // todo replace with stringbuffer
        for (let i = 0x00; i < 0x11; i++) file.signature += String.fromCharCode(buffer[i]);
        if (file.signature != "Extended Module: ") return false;
        file.signature = "X.M.";

        // ID=0x1A
        if (buffer[0x25] != 0x1a) return false;

        file.trackerVersion = this.readWord(buffer, 0x3a);
        if (file.trackerVersion < 0x0104) return false; // older versions not currently supported

        // song title
        let idx = 0x11;
        while (buffer[idx] && idx < 0x25) file.title += this.dosToUTF(buffer[idx++]);

        file.headerLength = this.readDWord(buffer, this.currentOffset);
        file.songLength = this.readWord(buffer, this.currentOffset + 4);
        file.repeatPos = this.readWord(buffer, this.currentOffset + 6);
        file.channelsNum = this.readWord(buffer, this.currentOffset + 8);
        file.patternsNum = this.readWord(buffer, this.currentOffset + 10);
        file.instrumentsNum = this.readWord(buffer, this.currentOffset + 12);

        // flags: 0 = linear frequency table, 1 = amiga frequency table
        file.amigaPeriods = this.readWord(buffer, this.currentOffset + 14) == 1;

        file.initSpeed = this.readWord(buffer, this.currentOffset + 16);
        file.initBPM = this.readWord(buffer, this.currentOffset + 18);
    }

    private parsePatterns(buffer: Uint8Array, file: XMFile) {

        // ===========================================================================================
        let patternsNum = 0;
        // pattern order table
        file.patternOrderTable = new Array(256);
        for (let i = 0; i < 256; i++) {
            file.patternOrderTable[i] = buffer[this.currentOffset + 20 + i];
            if (file.patternOrderTable[i] > patternsNum) patternsNum = file.patternOrderTable[i];
        }
        patternsNum++; // number of patterns

        // ===========================================================================================
        // allocate arrays for pattern data
        file.patterns = new Array(patternsNum);
        file.patternLength = new Array(patternsNum);

        // ===========================================================================================
        // load and unpack patterns
        this.currentOffset += file.headerLength; // initial offset for patterns (calculated from the offset where the data starts)

        for (let i = 0; i < file.patternsNum; i++) {
            file.patternLength[i] = this.readWord(buffer, this.currentOffset + 5);
            file.patterns[i] = new Uint8Array(file.channelsNum * file.patternLength[i] * 5);

            let pattern = file.patterns[i];

            // initialize every pattern to defaults prior to unpacking for each channel
            for (let k = 0; k < (file.patternLength[i] * file.channelsNum); k++) {
                pattern[k * 5 + 0] = 0; // note
                pattern[k * 5 + 1] = 0; // instrument
                pattern[k * 5 + 2] = 0; // volume
                pattern[k * 5 + 3] = 0; // command
                pattern[k * 5 + 4] = 0; // parameter
            }

            let datalen = this.readWord(buffer, this.currentOffset + 7); // size of pattern data
            this.currentOffset += this.readDWord(buffer, this.currentOffset); // jump over length of pattern header

            let j = 0;
            let k = 0;
            while (j < datalen) {
                let c = buffer[this.currentOffset + j++];
                if (c & 128) {
                    // first byte is a bitmask -> data is compressed
                    if (c & 1) pattern[k + 0] = buffer[this.currentOffset + j++];
                    if (c & 2) pattern[k + 1] = buffer[this.currentOffset + j++];
                    if (c & 4) pattern[k + 2] = buffer[this.currentOffset + j++];
                    if (c & 8) pattern[k + 3] = buffer[this.currentOffset + j++];
                    if (c & 16) pattern[k + 4] = buffer[this.currentOffset + j++];
                } else {
                    // first byte is note -> all columns present sequentially
                    pattern[k + 0] = c;
                    pattern[k + 1] = buffer[this.currentOffset + j++];
                    pattern[k + 2] = buffer[this.currentOffset + j++];
                    pattern[k + 3] = buffer[this.currentOffset + j++];
                    pattern[k + 4] = buffer[this.currentOffset + j++];
                }
                k += 5; // go to next 5 bytes
            }

            // ===========================================================================================
            // remapping edge values

            for (let k = 0; k < (file.patternLength[i] * file.channelsNum * 5); k += 5) {
                // remap note to st3-style, 255=no note, 254=note off
                if (pattern[k + 0] >= 0x61) {
                    pattern[k + 0] = 0xFE; // note off
                } else if (pattern[k + 0] == 0) {
                    pattern[k + 0] = 0xFF; // no note
                } else {
                    pattern[k + 0]--;
                }

                // remap volume column setvol to 0x00..0x40, tone porta to 0x50..0x5f and 0xff for nop
                if (pattern[k + 2] < 0x10) {
                    pattern[k + 2] = 0xff;
                } else if (pattern[k + 2] >= 0x10 && pattern[k + 2] <= 0x50) {
                    pattern[k + 2] -= 0x10;
                } else if (pattern[k + 2] >= 0xf0) pattern[k + 2] -= 0xa0;

                // command 255=no command
                // we need to remap it because value of 0 is also used for arpeggio
                if (pattern[k + 3] == 0 && pattern[k + 4] == 0) pattern[k + 3] = 255;

            }

            // unpack next pattern
            this.currentOffset += j;
        }

        // just for sure, set the value that is 100% correct
        file.patternsNum = patternsNum;
    }

    private parseInstruments(buffer: Uint8Array, file: XMFile) {
        file.instruments = new Array(file.instrumentsNum);
        for (let i = 0; i < file.instrumentsNum; i++) {
            let instrument = new Instrument();
            instrument.headerLength = this.readDWord(buffer, this.currentOffset);
            file.instruments[i] = instrument;
            this.parseInstrument(buffer, instrument);
        }
    }

    private parseInstrument(buffer: Uint8Array, instrument: Instrument) {

        let j = 0;
        while (buffer[this.currentOffset + 4 + j] && j < 0x16) {
            instrument.name += this.dosToUTF(buffer[this.currentOffset + 4 + j++]);
        }

        instrument.sampleCount = this.readWord(buffer, this.currentOffset + 0x1b);

        if (instrument.sampleCount != 0) {
            instrument.sampleHeaderLength = this.readDWord(buffer, this.currentOffset + 0x1d); // sample header length

            // sample numbers for all notes (96 bytes)
            for (let i = 0; i < 96; i++) {
                instrument.sampleMap[i] = buffer[this.currentOffset + 0x21 + i];
            }

            this.parseInstrumentEnvelopes(buffer, instrument);

            // vibrato
            instrument.vibratoType = buffer[this.currentOffset + 0x10b];
            instrument.vibratoSweep = buffer[this.currentOffset + 0x10c];
            instrument.vibratoDepth = buffer[this.currentOffset + 0x10d];
            instrument.vibratoRate = buffer[this.currentOffset + 0x10e];

            // volume fade out
            instrument.volFadeout = this.readWord(buffer, this.currentOffset + 0x10f);
            this.parseInstrumentSamples(buffer, instrument);
        } else {
            // create dummy sample with default vals
            instrument.samples[0] = new Sample();
            // just skip the header
            this.currentOffset += instrument.headerLength;
        }
    }

    private parseInstrumentEnvelopes(buffer: Uint8Array, instrument: Instrument) {
        // envelope points. the xm specs say 48 bytes per envelope, but while that may
        // technically be correct, what they don't say is that it means 12 pairs of
        // little endian words. first word is the x coordinate, second is y. point
        // 0 always has x=0.
        let tmpVolEnvelope = new Array(12); // volume envelope
        let tmpPanEnvelope = new Array(12); // panning envelope
        for (let i = 0; i < 12; i++) {
            let volXCoord = this.readWord(buffer, this.currentOffset + 0x81 + i * 4);
            let volYCoord = this.readWord(buffer, this.currentOffset + 0x81 + i * 4 + 2);
            tmpVolEnvelope[i] = new Uint16Array([volXCoord, volYCoord]);
            // todo.. we are putting last volume into first panning perhaps???!
            let panXCoord = this.readWord(buffer, this.currentOffset + 0xc1 + i * 4);
            let panYCoord = this.readWord(buffer, this.currentOffset + 0xc1 + i * 4 + 2);
            tmpPanEnvelope[i] = new Uint16Array([panXCoord, panYCoord]);
        }

        // are envelopes enabled?
        instrument.volFlags = buffer[this.currentOffset + 0x109];
        instrument.panFlags = buffer[this.currentOffset + 0x10a];

        // pre-interpolate the envelopes to arrays of [0..1] float32 values which
        // are stepped through at a rate of one per tick. max tick count is 0x0144.

        // volume envelope
        for (let j = 0; j < 325; j++) instrument.volEnvelope[j] = 1.0;

        if (instrument.volFlags & 1) {
            for (let j = 0; j < 325; j++) {
                let p = 1;
                let delta: number;
                while (tmpVolEnvelope[p][0] < j && p < 11) p++;
                if (tmpVolEnvelope[p][0] == tmpVolEnvelope[p - 1][0]) {
                    delta = 0;
                } else {
                    delta = (tmpVolEnvelope[p][1] - tmpVolEnvelope[p - 1][1]) / (tmpVolEnvelope[p][0] - tmpVolEnvelope[p - 1][0]);
                }
                instrument.volEnvelope[j] = (tmpVolEnvelope[p - 1][1] + delta * (j - tmpVolEnvelope[p - 1][0])) / 64.0;
            }
            instrument.volEnvLength = tmpVolEnvelope[Math.max(0, buffer[this.currentOffset + 0x101] - 1)][0];
            instrument.volSustain = tmpVolEnvelope[buffer[this.currentOffset + 0x103]][0];
            instrument.volLoopStart = tmpVolEnvelope[buffer[this.currentOffset + 0x104]][0];
            instrument.volLoopEnd = tmpVolEnvelope[buffer[this.currentOffset + 0x105]][0];
        }

        // pan envelope
        for (let j = 0; j < 325; j++) instrument.panEnvelope[j] = 0.5;
        
        if (instrument.panFlags & 1) {
            for (let j = 0; j < 325; j++) {
                let p = 1;
                let delta: number;
                while (tmpPanEnvelope[p][0] < j && p < 11) p++;
                if (tmpPanEnvelope[p][0] == tmpPanEnvelope[p - 1][0]) {
                    delta = 0;
                } else {
                    delta = (tmpPanEnvelope[p][1] - tmpPanEnvelope[p - 1][1]) / (tmpPanEnvelope[p][0] - tmpPanEnvelope[p - 1][0]);
                }
                instrument.panEnvelope[j] = (tmpPanEnvelope[p - 1][1] + delta * (j - tmpPanEnvelope[p - 1][0])) / 64.0;
            }
            instrument.panEnvLength = tmpPanEnvelope[Math.max(0, buffer[this.currentOffset + 0x102] - 1)][0];
            instrument.panSustain = tmpPanEnvelope[buffer[this.currentOffset + 0x106]][0];
            instrument.panLoopStart = tmpPanEnvelope[buffer[this.currentOffset + 0x107]][0];
            instrument.panLoopEnd = tmpPanEnvelope[buffer[this.currentOffset + 0x108]][0];
        }
    }

    private parseInstrumentSamples(buffer: Uint8Array, instrument: Instrument) {
        // ===========================================================
        // sample headers
        this.currentOffset += instrument.headerLength;
        instrument.samples = new Array(instrument.sampleCount);

        for (let j = 0; j < instrument.sampleCount; j++) {
            let datalen = this.readDWord(buffer, this.currentOffset + 0);
            instrument.samples[j] = new Sample();
            let sample = instrument.samples[j];

            let k = 0;
            while (buffer[this.currentOffset + 0x12 + k] && k < 0x16) sample.name += this.dosToUTF(buffer[this.currentOffset + 0x12 + k++]);

            sample.bits = (buffer[this.currentOffset + 0xe] & 0x10) ? 16 : 8; // sample type (we don't use it, only number of bites) 
            sample.bps = (sample.bits == 16) ? 2 : 1; // bytes per sample

            // sample length and loop points are in BYTES even for 16-bit samples!
            sample.length = datalen / sample.bps;
            sample.loopStart = this.readDWord(buffer, this.currentOffset + 4) / sample.bps;
            sample.loopLength = this.readDWord(buffer, this.currentOffset + 8) / sample.bps;
            sample.loopEnd = sample.loopStart + sample.loopLength;
            sample.loopType = buffer[this.currentOffset + 0xe] & 0x03;
            sample.volume = buffer[this.currentOffset + 0xc];

            // finetune and seminote tuning (-128..+127)
            // +-127 is one half-tone
            if (buffer[this.currentOffset + 0xd] < 128) {
                sample.fineTune = buffer[this.currentOffset + 0xd];
            } else {
                sample.fineTune = buffer[this.currentOffset + 0xd] - 256;
            }
            if (buffer[this.currentOffset + 0x10] < 128) {
                sample.relativeNote = buffer[this.currentOffset + 0x10];
            } else {
                sample.relativeNote = buffer[this.currentOffset + 0x10] - 256;
            }

            sample.panning = buffer[this.currentOffset + 0xf];

            this.currentOffset += instrument.sampleHeaderLength;
        }

        // ===========================================================
        // sample data (convert to signed float32), stored as delta compressed data
        for (let j = 0; j < instrument.sampleCount; j++) {
            let sample = instrument.samples[j];
            sample.data = new Float32Array(sample.length);
            let c = 0;
            if (sample.bits == 16) {
                // 16 bits per sample
                for (let k = 0; k < sample.length; k++) {
                    c += this.readSignedWord(buffer, this.currentOffset + k * 2);
                    if (c < -32768) c += 65536;
                    if (c > 32767) c -= 65536;
                    sample.data[k] = c / 32768.0;
                }
            } else {
                // 8 bits per sample
                for (let k = 0; k < sample.length; k++) {
                    c += this.readSignedByte(buffer, this.currentOffset + k);
                    if (c < -128) c += 256;
                    if (c > 127) c -= 256;
                    sample.data[k] = c / 128.0;
                }
            }
            this.currentOffset += sample.length * sample.bps;
        }
    }


    // ============ XM Files should be in little endian

    // little endian unsigned word
    private readWord(buffer: Uint8Array, offset: number): number {
        return buffer[offset] | (buffer[offset + 1] << 8);
    }

    // little endian double unsigned word
    private readDWord(buffer: Uint8Array, offset: number): number {
        return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24);
    }

    // signed byte
    private readSignedByte(buffer: Uint8Array, offset: number): number {
        return (buffer[offset] < 128) ? buffer[offset] : (buffer[offset] - 256);
    }

    // little endian signed word
    private readSignedWord(buffer: Uint8Array, offset: number): number {
        return (this.readWord(buffer, offset) < 32768) ? this.readWord(buffer, offset) : (this.readWord(buffer, offset) - 65536);
    }

    // convert from MS-DOS extended ASCII to Unicode
    private dosToUTF(c: number): string {
        if (c < 128) return String.fromCharCode(c);
        var cs = [
            0x00c7, 0x00fc, 0x00e9, 0x00e2, 0x00e4, 0x00e0, 0x00e5, 0x00e7, 0x00ea, 0x00eb, 0x00e8, 0x00ef, 0x00ee, 0x00ec, 0x00c4, 0x00c5,
            0x00c9, 0x00e6, 0x00c6, 0x00f4, 0x00f6, 0x00f2, 0x00fb, 0x00f9, 0x00ff, 0x00d6, 0x00dc, 0x00f8, 0x00a3, 0x00d8, 0x00d7, 0x0192,
            0x00e1, 0x00ed, 0x00f3, 0x00fa, 0x00f1, 0x00d1, 0x00aa, 0x00ba, 0x00bf, 0x00ae, 0x00ac, 0x00bd, 0x00bc, 0x00a1, 0x00ab, 0x00bb,
            0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x00c1, 0x00c2, 0x00c0, 0x00a9, 0x2563, 0x2551, 0x2557, 0x255d, 0x00a2, 0x00a5, 0x2510,
            0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x00e3, 0x00c3, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x00a4,
            0x00f0, 0x00d0, 0x00ca, 0x00cb, 0x00c8, 0x0131, 0x00cd, 0x00ce, 0x00cf, 0x2518, 0x250c, 0x2588, 0x2584, 0x00a6, 0x00cc, 0x2580,
            0x00d3, 0x00df, 0x00d4, 0x00d2, 0x00f5, 0x00d5, 0x00b5, 0x00fe, 0x00de, 0x00da, 0x00db, 0x00d9, 0x00fd, 0x00dd, 0x00af, 0x00b4,
            0x00ad, 0x00b1, 0x2017, 0x00be, 0x00b6, 0x00a7, 0x00f7, 0x00b8, 0x00b0, 0x00a8, 0x00b7, 0x00b9, 0x00b3, 0x00b2, 0x25a0, 0x00a0
        ];
        return String.fromCharCode(cs[c - 128]);
    }
}