import { XMContext, Channel, XM_FLAG_PATTERN_JUMP, XM_FLAG_LOOP_PATTERN } from './context';
import { calcPeriod } from "./utils";


type EffectFunc = (firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) => void;
type VolEffectFunc = (firstTick: boolean, channel: Channel, context: XMContext, effects: Effects, param: number) => void;

/**
 * Special effects
 */
export default class Effects {
    vibratotable: Float32Array[];
    voleffects: VolEffectFunc[] = []; // volume effect jumptable
    effects: EffectFunc[] = []; // general effect jumptable
    eEffects: EffectFunc[] = []; // special E-effect jumptable

    constructor() {
        // volume column effect jumptable for 0x50..0xef
        // there is no effect at 0x00
        this.voleffects[0x01] = this.volEffect60;
        this.voleffects[0x02] = this.volEffect70;
        this.voleffects[0x03] = this.volEffect80;
        this.voleffects[0x04] = this.volEffect90;
        this.voleffects[0x05] = this.volEffectA0;
        this.voleffects[0x06] = this.volEffectB0;
        this.voleffects[0x07] = this.volEffectC0;
        this.voleffects[0x08] = this.volEffectD0;
        this.voleffects[0x09] = this.volEffectE0;
        this.voleffects[0x0A] = this.volEffectF0;

        // effect jumptables 
        this.effects[0x00] = this.effect0;
        this.effects[0x01] = this.effect1;
        this.effects[0x02] = this.effect2;
        this.effects[0x03] = this.effect3;
        this.effects[0x04] = this.effect4;
        this.effects[0x05] = this.effect5;
        this.effects[0x06] = this.effect6;
        this.effects[0x07] = this.effect7;
        this.effects[0x08] = this.effect8;
        this.effects[0x09] = this.effect9;
        this.effects[0x0a] = this.effectA;
        this.effects[0x0b] = this.effectB;
        this.effects[0x0c] = this.effectC;
        this.effects[0x0d] = this.effectD;
        this.effects[0x0e] = this.effectE;
        this.effects[0x0f] = this.effectF;
        this.effects[0x10] = this.effectG;
        this.effects[0x11] = this.effectH;
        this.effects[0x12] = this.effectI;
        this.effects[0x13] = this.effectJ;
        this.effects[0x14] = this.effectK;
        this.effects[0x15] = this.effectL;
        this.effects[0x16] = this.effectM;
        this.effects[0x17] = this.effectN;
        this.effects[0x18] = this.effectO;
        this.effects[0x19] = this.effectP;
        this.effects[0x1a] = this.effectQ;
        this.effects[0x1b] = this.effectR;
        this.effects[0x1c] = this.effectS;
        this.effects[0x1d] = this.effectT;
        this.effects[0x1e] = this.effectU;
        this.effects[0x1f] = this.effectV;
        this.effects[0x20] = this.effectW;
        this.effects[0x21] = this.effectX;
        this.effects[0x22] = this.effectY;
        this.effects[0x23] = this.effectZ;

        this.eEffects[0x00] = this.eEffect0;
        this.eEffects[0x01] = this.eEffect1;
        this.eEffects[0x02] = this.eEffect2;
        this.eEffects[0x03] = this.eEffect3;
        this.eEffects[0x04] = this.eEffect4;
        this.eEffects[0x05] = this.eEffect5;
        this.eEffects[0x06] = this.eEffect6;
        this.eEffects[0x07] = this.eEffect7;
        this.eEffects[0x08] = this.eEffect8;
        this.eEffects[0x09] = this.eEffect9;
        this.eEffects[0x0a] = this.eEffectA;
        this.eEffects[0x0b] = this.eEffectB;
        this.eEffects[0x0c] = this.eEffectC;
        this.eEffects[0x0d] = this.eEffectD;
        this.eEffects[0x0e] = this.eEffectE;
        this.eEffects[0x0f] = this.eEffectF;

        // calc tables for vibrato waveforms
        this.vibratotable = [new Float32Array(64), new Float32Array(64), new Float32Array(64), new Float32Array(64)];

        for (let i = 0; i < 64; i++) {
            this.vibratotable[0][i] = 127 * Math.sin(2 * Math.PI * (i / 64)); // 127 * sin(<0,360°>)
            this.vibratotable[1][i] = 127 - 4 * i; // linear: 127 - 4 * <0, 63>
            this.vibratotable[2][i] = (i < 32) ? 127 : -127; // signum
            this.vibratotable[3][i] = (1 - 2 * Math.random()) * 127; // random
        }
    }
    //
    // volume column effect functions
    //
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

    //
    // tick 0 effect functions
    //
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

    effect5(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 5
        if (firstTick) {
            effects.effectA(true, channel, context, effects);
        } else {
            effects.effect3(false, channel, context, effects); // slide to note
            effects.effectA(false, channel, context, effects); // volslide
        }
    }

    effect6(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 6
        if (firstTick) {
            effects.effectA(true, channel, context, effects);
        } else {
            effects.effect4(false, channel, context, effects); // vibrato
            effects.effectA(false, channel, context, effects); // volslide
        }
    }

    effect7(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 7
        if (firstTick) {
            // todo first tick impl
        } else {
            // todo 1+ tick impl
        }
    }

    effect8(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // 8 set panning
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

    effectA(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // a volume slide
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

    effectE(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e
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

    effectI(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // i
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectJ(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // j
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

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

    effectM(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // m
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectN(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // n
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectO(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // o 
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectP(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // p panning slide
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectQ(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // q
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectR(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // r multi retrig note
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectS(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // s
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectT(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // t tremor
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectU(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // u
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectV(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // v
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectW(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // w
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectX(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // x extra fine porta up/down
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectY(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // y
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    effectZ(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // z
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    eEffect0(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e0 filter on/off
        // syntax E+0+1 to make your .MOD file sound terrible on an Amiga
        // docu: this effect is not implemented in FT due to the fact that it's totally useless
    }

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

    eEffect7(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e7
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }

    eEffect8(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e8, use for syncing
        if (firstTick) {
            
        } else {
            // TODO +1 tick impl
        }
    }

    eEffect9(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // e9
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

    eEffectC(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ec
        if (firstTick) {
            // TODO first tick impl
        } else {
            if (context.tick == (channel.param & 0x0f))
                channel.voiceVolume = 0;
        }
    }

    eEffectD(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ed delay sample
        // same for all ticks
        if (context.tick == (channel.param & 0x0f)) {
            // TODO this shall be implemented directly in the player
            //player.processNote(player.modFile.patternOrderTable[player.position], ch);
        }
    }

    eEffectE(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ee delay pattern
        if (firstTick) {
            context.patternDelay = channel.param & 0x0f;
            context.patternWait = 0;
        } else {
            // TODO +1 tick impl
        }
    }

    eEffectF(firstTick: boolean, channel: Channel, context: XMContext, effects: Effects) { // ef
        if (firstTick) {
            // TODO first tick impl
        } else {
            // TODO 1+ tick impl
        }
    }
}
