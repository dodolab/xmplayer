import { XMContext, Channel, XM_FLAG_PATTERN_JUMP, XM_FLAG_LOOP_PATTERN } from './context';
import { calcPeriod } from "./utils";


type EffectFunc = (firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) => void;
type VolEffectFunc = (firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) => void;


/**
 * Special effect functions
 */
export default class Effects {

    vibratotable: Float32Array[];
    voleffects: VolEffectFunc[] = []; // volume effect jumptable
    effects: EffectFunc[] = []; // general effect jumptable
    eEffects: EffectFunc[] = []; // special E-effect jumptable

    constructor() {
        // volume column effect jumptable for 0x50..0xef
        // there is no effect at 0x00
        this.voleffects[0x01] = this.volEffect60;   // 60-6f vol slide down
        this.voleffects[0x02] = this.volEffect70;   // 70-7f vol slide up
        this.voleffects[0x03] = this.volEffect80;   // 80-8f fine vol slide down
        this.voleffects[0x04] = this.volEffect90;   // 90-9f fine vol slide up
        this.voleffects[0x05] = this.volEffectA0;   // a0-af set vibrato speed
        this.voleffects[0x06] = this.volEffectB0;   // b0-bf vibrato
        this.voleffects[0x07] = this.volEffectC0;   // c0-cf set panning
        this.voleffects[0x08] = this.volEffectD0;   // d0-df panning slide left
        this.voleffects[0x09] = this.volEffectE0;   // e0-ef panning slide right
        this.voleffects[0x0A] = this.volEffectF0;   // f0-ff tone porta

        // effect jumptables 
        this.effects[0x00] = this.effect0;      // 0 arpeggio
        this.effects[0x01] = this.effect1;      // 1 slide up
        this.effects[0x02] = this.effect2;      // 2 slide down
        this.effects[0x03] = this.effect3;      // 3 slide to note
        this.effects[0x04] = this.effect4;      // 4 vibrato
        this.effects[0x05] = this.effect5;      // 5 tone portamento + volume slide
        this.effects[0x06] = this.effect6;      // 6 vibrato + volume slide
        this.effects[0x07] = this.effect7;      // 7 tremolo
        this.effects[0x08] = this.effect8;      // 8 set panning position
        this.effects[0x09] = this.effect9;      // 9 set sample offset
        this.effects[0x0a] = this.effectA;      // a volume slide up/down
        this.effects[0x0b] = this.effectB;      // b pattern jump
        this.effects[0x0c] = this.effectC;      // c set volume
        this.effects[0x0d] = this.effectD;      // d pattern break
        this.effects[0x0e] = this.effectE;      // e effects switch
        this.effects[0x0f] = this.effectF;      // f set speed
        this.effects[0x10] = this.effectG;      // g set global volume
        this.effects[0x11] = this.effectH;      // h global volume slide
        //this.effects[0x12] = this.effectI;    not used
        //this.effects[0x13] = this.effectJ;    not used
        this.effects[0x14] = this.effectK;      // k key off
        this.effects[0x15] = this.effectL;      // l set envelope position
        //this.effects[0x16] = this.effectM;    not used
        //this.effects[0x17] = this.effectN;    not used
        //this.effects[0x18] = this.effectO;    not used
        this.effects[0x19] = this.effectP;      // p panning slide
        //this.effects[0x1a] = this.effectQ;    not used
        this.effects[0x1b] = this.effectR;      // r multi retrig note
        //this.effects[0x1c] = this.effectS;    not used
        this.effects[0x1d] = this.effectT;      // t tremor
        //this.effects[0x1e] = this.effectU;    not used
        //this.effects[0x1f] = this.effectV;    not used
        //this.effects[0x20] = this.effectW;    not used
        this.effects[0x21] = this.effectX;      // x extra fine porta up/down
        //this.effects[0x22] = this.effectY;    not used
        //this.effects[0x23] = this.effectZ;    not used

        //this.eEffects[0x00] = this.eEffect0;  not used
        this.eEffects[0x01] = this.eEffect1;    // e1 fine slide up
        this.eEffects[0x02] = this.eEffect2;    // e2 fine slide down
        this.eEffects[0x03] = this.eEffect3;    // e3 set glissando
        this.eEffects[0x04] = this.eEffect4;    // e4 set vibrato waveform
        this.eEffects[0x05] = this.eEffect5;    // e5 set finetune
        this.eEffects[0x06] = this.eEffect6;    // e6 loop pattern
        this.eEffects[0x07] = this.eEffect7;    // e7 tremolo control
        //this.eEffects[0x08] = this.eEffect8;  not used
        this.eEffects[0x09] = this.eEffect9;    // e9 retrig note
        this.eEffects[0x0a] = this.eEffectA;    // ea fine volslide up
        this.eEffects[0x0b] = this.eEffectB;    // eb fine volslide down
        this.eEffects[0x0c] = this.eEffectC;    // ec note cut
        this.eEffects[0x0d] = this.eEffectD;    // ed note delay
        this.eEffects[0x0e] = this.eEffectE;    // ee pattern delay
        //this.eEffects[0x0f] = this.eEffectF;  not used

        // calc tables for vibrato waveforms
        this.vibratotable = [new Float32Array(64), new Float32Array(64), new Float32Array(64), new Float32Array(64)];

        for (let i = 0; i < 64; i++) {
            this.vibratotable[0][i] = 127 * Math.sin(2 * Math.PI * (i / 64)); // 127 * sin(<0,360°>)
            this.vibratotable[1][i] = 127 - 4 * i; // linear: 127 - 4 * <0, 63>
            this.vibratotable[2][i] = (i < 32) ? 127 : -127; // signum
            this.vibratotable[3][i] = (1 - 2 * Math.random()) * 127; // random
        }
    }


    // ==============================
    // volume column effect functions
    // ==============================

    volEffect60(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // 60-6f vol slide down
        if (firstTick) {
            // TODO first tick impl
        } else {
            channel.voiceVolume = Math.max(0, channel.voiceVolume - param);
        }
    }

    volEffect70(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // 70-7f vol slide up
        if (firstTick) {
            // TODO first tick impl
        } else {
            channel.voiceVolume = Math.min(64, channel.voiceVolume + param);
        }
    }

    volEffect80(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // 80-8f fine vol slide down
        if (firstTick) {
            channel.voiceVolume = Math.max(0, channel.voiceVolume - param);
        } else {

        }
    }

    volEffect90(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // 90-9f fine vol slide up
        if (firstTick) {
            channel.voiceVolume = Math.min(64, channel.voiceVolume + param);
        } else {

        }
    }

    volEffectA0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // a0-af set vibrato speed
        if (firstTick) {
            channel.vibratoSpeed = param;
        } else {

        }
    }

    volEffectB0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // b0-bf vibrato
        if (firstTick) {
            if (param != 0) channel.vibratoDepth = param;
            effects.effect4(false, channel, context, effects); // todo check if really not first tick
        } else {
            effects.effect4(false, channel, context, effects); // same as effect column vibrato on ticks 1+
        }
    }

    volEffectC0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // c0-cf set panning
        if (firstTick) {
            channel.pan = (param & 0x0f) / 15.0; // percentage of 0xF
        } else {

        }
    }

    volEffectD0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // d0-df panning slide left
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    volEffectE0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // e0-ef panning slide right
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    volEffectF0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) { // f0-ff tone porta
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    // ==============================
    // special effect functions
    // ==============================

    effect0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 0 arpeggio
        if (firstTick) {
            channel.arpeggio = channel.param;
        } else {
            if (channel.param != 0) {
                let apn = channel.note;
                // note is in format (octave|note, e.g. 3C for C3)
                if ((context.tick % 3) == 1) apn += channel.arpeggio >> 4;
                if ((context.tick % 3) == 2) apn += channel.arpeggio & 0x0f;

                let relativeNote = channel.sample.relativeNote;
                let fineTune = channel.sample.fineTune;
                channel.voicePeriod = calcPeriod(apn + relativeNote, fineTune, context.amigaPeriods);
                channel.voicePeriodChanged = true;
            }
        }
    }

    effect1(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 1 slide up
        if (firstTick) {
            if (channel.param) channel.slideUpSpeed = channel.param * 4;
        } else {
            channel.voicePeriod -= channel.slideUpSpeed;
            if (channel.voicePeriod < 1) channel.voicePeriod += 65535; // indeed, FT2 logic...
            channel.voicePeriodChanged = true;
        }
    }

    effect2(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 2 slide down
        if (firstTick) {
            if (channel.param) channel.slideDownSpeed = channel.param * 4;
        } else {
            channel.voicePeriod = Math.min(7680, channel.voicePeriod + channel.slideDownSpeed);
            channel.voicePeriodChanged = true; 
        }
    }

    effect3(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 3 slide to note
        if (firstTick) {
            if (channel.param) channel.slideToSpeed = channel.param * 4;
        } else {
            if (channel.voicePeriod < channel.slideTo) {
                channel.voicePeriod += channel.slideToSpeed;
                if (channel.voicePeriod > channel.slideTo)
                    channel.voicePeriod = channel.slideTo;
            }
            if (channel.voicePeriod > channel.slideTo) {
                channel.voicePeriod -= channel.slideToSpeed;
                if (channel.voicePeriod < channel.slideTo)
                    channel.voicePeriod = channel.slideTo;
            }
            channel.voicePeriodChanged = true; 
        }
    }

    effect4(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 4 vibrato
        if (firstTick) {
            // todo, why not only & 0xFF check??
            if (channel.param & 0x0f && channel.param & 0xf0) {
                channel.vibratoDepth = (channel.param & 0x0f);
                channel.vibratoSpeed = (channel.param & 0xf0) >> 4;
            }
            effects.effect4(false, channel, context, effects);
        } else {
            let waveform = effects.vibratotable[channel.vibratoWave & 3][channel.vibratoPos] / 63.0;
            let increase = channel.vibratoDepth * waveform;
            channel.voicePeriod += increase;
            channel.voicePeriodChanged = true;
        }
    }

    effect5(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 5 tone portamento + volume slide
        if (firstTick) {
            effects.effectA(true, channel, context, effects);
        } else {
            effects.effect3(false, channel, context, effects); // slide to note
            effects.effectA(false, channel, context, effects); // volslide
        }
    }

    effect6(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 6 vibrato + volume slide
        if (firstTick) {
            effects.effectA(true, channel, context, effects);
        } else {
            effects.effect4(false, channel, context, effects); // vibrato
            effects.effectA(false, channel, context, effects); // volslide
        }
    }

    effect7(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 7 tremolo
        // TODO - syntax is the same as for the vibrato
        if (firstTick) {
            // todo first tick impl
        } else {
            // todo 1+ tick impl
        }
    }

    effect8(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 8 set panning position
        if (firstTick) {
            channel.pan = channel.param / 255.0;
        } else {
            // TODO +1 tick impl
        }
    }

    effect9(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 9 set sample offset
        if (firstTick) {
            channel.samplePos = channel.param * 256;
            channel.playDir = 1; // go forward
            channel.trigRamp = 0.0;
            channel.trigRampFrom = channel.currentSample;
        } else {
            // TODO 1+ tick impl
        }
    }

    effectA(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // a volume slide up/down
        if (firstTick) {
            // this behavior differs from protracker!! A00 will slide using previous non-zero parameter.
            if (channel.param) channel.volSlide = channel.param;
        } else {
            if (!(channel.volSlide & 0x0f)) {
                // y is zero, slide up
                channel.voiceVolume = Math.min(64, channel.voiceVolume + (channel.volSlide >> 4));
            }
            if (!(channel.volSlide & 0xf0)) {
                // x is zero, slide down
                channel.voiceVolume = Math.max(0, channel.voiceVolume - channel.volSlide & 0x0f);
            }
        }
    }

    effectB(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // b pattern jump
        if (firstTick) {
            context.breakRow = 0;
            context.patternJump = channel.param;
            context.flags |= XM_FLAG_PATTERN_JUMP;
        } else {
            // TODO +1 tick impl
        }
    }

    effectC(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // c set volume
        if (firstTick) {
            channel.voiceVolume = Math.min(64, Math.max(0, channel.param));
        } else {
            // TODO +1 tick impl
        }
    }

    effectD(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // d pattern break
        if (firstTick) {
            context.breakRow = ((channel.param & 0xf0) >> 4) * 10 + (channel.param & 0x0f);
            if (!(context.flags & XM_FLAG_PATTERN_JUMP)) context.patternJump = context.position + 1;
            context.flags |= XM_FLAG_PATTERN_JUMP;
        } else {
            // TODO +1 tick impl
        }
    }

    effectE(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e E effects
        let eEffectIndex = (channel.param & 0xf0) >> 4; // convert ABCD0000 to ABCD
        effects.eEffects[eEffectIndex](firstTick, channel, context, effects);
    }

    effectF(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // f set speed
        if (firstTick) {
            if (channel.param > 32) {
                context.currentBpm = channel.param;
            } else {
                if (channel.param != 0) context.currentSpeed = channel.param;
            }
        } else {
            // TODO +1 tick impl
        }
    }

    effectG(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // g set global volume
        if (firstTick) {
            if (channel.param <= 0x40) context.volume = channel.param;
        } else {
            // TODO +1 tick impl
        }
    }

    effectH(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // h global volume slide
        if (firstTick) {
            if (channel.param) context.globalVolSlide = channel.param;
        } else {
            if (!(context.globalVolSlide & 0x0f)) {
                // y is zero, slide up
                context.volume = Math.min(64, context.volume + (context.globalVolSlide >> 4));
            }
            if (!(context.globalVolSlide & 0xf0)) {
                // x is zero, slide down
                context.volume = Math.max(0, context.volume -  (context.globalVolSlide & 0x0f));
            }
        }
    }

    // I,J not supported by XM format

    effectK(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // k key off
        if (firstTick) {
            channel.noteOn = false;
            if (!(channel.instrument.volFlags & 1)) channel.voiceVolume = 0;
        } else {
            // TODO +1 tick impl
        }
    }

    effectL(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // l set envelope position
        if (firstTick) {
            channel.volEnvPos = channel.param;
            channel.panEnvPos = channel.param;
        } else {

        }
    }

    // M,N,O not supported by XM format

    effectP(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // p panning slide
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    // Q not supported by XM format

    effectR(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // r multi retrig note
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    // S not supported by XM format

    effectT(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // t tremor
        // This weird command will set the volume to zero during off time number of ticks
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    // U,V,W not supported by XM

    effectX(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // x extra fine porta up/down
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    // Y,Z not supported by XM

    // ==============================
    // E-effect functions
    // ==============================

    // E0 is a legacy from MOD file and it's not supported by XM format

    eEffect1(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e1 fine slide up
        if (firstTick) {
            channel.period = Math.max(113, channel.period - channel.param & 0x0f);
        } else {
            // TODO +1 tick impl
        }
    }

    eEffect2(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e2 fine slide down
        if (firstTick) {
            channel.period = Math.min(856, channel.period + channel.param & 0x0f);
            channel.voicePeriodChanged = true;
        } else {
            // TODO +1 tick impl
        }
    }

    eEffect3(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e3 set glissando
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    eEffect4(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e4 set vibrato waveform
        if (firstTick) {
            channel.vibratoWave = channel.param & 0x07;
        } else {
            // TODO +1 tick impl
        }
    }

    eEffect5(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e5 set finetune
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    eEffect6(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e6 loop pattern
        if (firstTick) {
            if (channel.param & 0x0f) {
                if (context.loopCount != 0) {
                    context.loopCount--;
                    context.flags |= XM_FLAG_LOOP_PATTERN;
                } else {
                    context.loopCount = channel.param & 0x0f;
                }
            } else {
                context.loopRow = context.row;
            }
        } else {
            // TODO +1 tick impl
        }
    }

    eEffect7(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e7 tremolo control
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    // E8 not supported by XM format

    eEffect9(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e9 retrig note
        if (firstTick) {
            // TODO first tick impl
        } else {
            if (context.tick % (channel.param & 0x0f) == 0) {
                channel.samplePos = 0;
                channel.playDir = 1;

                channel.trigRamp = 0.0;
                channel.trigRampFrom = channel.currentSample;

                channel.fadeOutPos = 65535;
                channel.volEnvPos = 0;
                channel.panEnvPos = 0;
            }
        }
    }

    eEffectA(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ea fine volslide up
        if (firstTick) {
            channel.voiceVolume = Math.min(64, channel.voiceVolume + channel.param & 0x0f);
        } else {
            // TODO +1 tick impl
        }
    }

    eEffectB(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // eb fine volslide down
        if (firstTick) {
            channel.voiceVolume = Math.max(0, channel.voiceVolume - channel.param & 0x0f);
        } else {
            // TODO +1 tick impl
        }
    }

    eEffectC(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ec note cut
        if (firstTick) {
            // TODO first tick impl
        } else {
            if (context.tick == (channel.param & 0x0f))
                channel.voiceVolume = 0;
        }
    }

    eEffectD(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ed note delay
        // same for all ticks
        if (context.tick == (channel.param & 0x0f)) {
            // TODO this shall be implemented directly in the player
            //player.processNote(player.modFile.patternOrderTable[player.position], ch);
        }
    }

    eEffectE(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ee pattern delay
        if (firstTick) {
            context.patternDelay = channel.param & 0x0f;
            context.patternWait = 0;
        } else {
            // TODO +1 tick impl
        }
    }

    // F not supported by XM format
}
