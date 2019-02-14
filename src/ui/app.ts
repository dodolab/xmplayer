
// codepage 128x192, 16x16 -> 8x12px

import * as PIXI from 'pixi.js';
import XMPlayer from '../xmlib/player';

var modFiles = [
    "Black Riders keygen",
    "BRD Keygen",
    "Chip Mania",
    "Cracked Zone",
    "dance_with_a_daemon",
    "Estaryk",
    "GAME1_Level_0",
    "GAME7_Level_6",
    "Prehistorik 2",
    "Test Drive II",
    "Toilet story",
    "Trolls",
    "Under SEH",
    "Unreal Superhero 3"
];

class XMPlayerApp {
    app: PIXI.Application = null;
    lastTime = 0;
    gameTime = 0;
    ticker: PIXI.ticker.Ticker = null;
    player: XMPlayer;
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;

    gfx: PIXI.Graphics;

    fontSize = 32;
    lettersPerChannel = 14;
    leftBlockLength = 3 + 32;
    markerIndex = 6;
    trackerStartIndex = 0;

    virtualWidth = 1920;
    virtualHeight = 1080;

    filePositions = [];

    init() {
        this.canvas = <HTMLCanvasElement>document.getElementById('player');

        this.canvas.addEventListener("mousedown", (evt: MouseEvent) => {
            for(let filePos of this.filePositions){
                let posX = filePos.posX as number;
                let posY = filePos.posY as number;
                let sizeX = filePos.sizeX;
                let sizeY = filePos.sizeY;

                let mouseX = evt.offsetX;
                let mouseY = evt.offsetY;

                if(mouseX >= posX && mouseX <= posX + sizeX && mouseY >= posY && mouseY <= posY + sizeY){
                    this.player.pause();
                    this.playSong(filePos.song);
                    return;
                }
            }
        });

        this.ctx = this.canvas.getContext("2d");
        this.ctx.font = this.fontSize + "px VGA";
        // set fix size and set scale
        this.canvas.height = this.virtualHeight;
        this.canvas.width = this.virtualWidth;
        resizeCanvas(this.canvas, this.virtualWidth, this.virtualHeight);
        window.addEventListener("resize", () => {
            resizeCanvas(this.canvas, this.virtualWidth, this.virtualHeight);
            this.recalcFonts();
        });

        let listener = () => {
            document.body.removeEventListener("mousedown", listener);
            this.player = new XMPlayer();
            this.playSong(modFiles[(Math.floor(Math.random()*modFiles.length))]);

            this.player.onReady = () => {
                this.recalcFonts();
                this.player.play();
                this.loop(0);
            }

            this.player.onPlay = () => this.loop(0);
        };

        document.body.addEventListener("mousedown", listener);
    }

    currentSong = "";

    private playSong(songName: string) {
        this.currentSong = songName;
        this.player.load("assets/mods/" + songName + ".xm");
    }

    private drawString(str: string, posX: number, posY: number, color = "rgb(255,255,255") {
        this.ctx.fillStyle = color;
        this.ctx.fillText(str, this.fontSize + this.fontSize / 2 * posX, this.fontSize + this.fontSize * posY);
    }

    private recalcFonts() {
        let channels = this.player.channelsNum;
        let canvasWidth = this.virtualWidth;
        this.fontSize = Math.min(32,2 * canvasWidth / (channels * this.lettersPerChannel + this.leftBlockLength));
        this.ctx.font = this.fontSize + "px VGA";
    }

    private loop(time) {

        let dt = (time - this.lastTime);
        this.lastTime = time;
        this.gameTime += dt;
        // update our own logic 
        this.update(dt, this.gameTime);
        // draw PIXI internal
        // this.ticker.update(this.gameTime);
        requestAnimationFrame((time) => this.loop(time));
    }

    private update(delta: number, absolute: number) {
        this.ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

        // render instruments
        for (let i = 0; i < this.player.sampleNum; i++){
            let sampleName = this.player.getSampleName(i);
            if(sampleName.length == 0) sampleName = "Unknown sample";
            let isNoteOn = false;

            for(let c = 0; c < this.player.channelsNum; c++){
                let smp = this.player.currentSample(c);
                if(this.player.isNoteOn(c) && smp == i){
                    isNoteOn = true;        
                    break;  
                }
            }

            this.drawString(sampleName, 0, i, isNoteOn ? "rgb(0,129,255)" : "rgb(255,255,255)");
        }

        let tempFilePos = [];
        // render songs
        for(let i = 0; i<modFiles.length; i++) {
            let song = modFiles[i];
            let posX = this.fontSize + this.fontSize / 2 * 0;
            let posY = this.fontSize + this.fontSize * (this.player.sampleNum + i);
            let sizeX = song.length*this.fontSize/2;
            let sizeY = this.fontSize;
            tempFilePos.push({
                posX: posX, posY: posY, sizeX: sizeX, sizeY: sizeY, song: song
            });
            this.drawString(song, 0, this.player.sampleNum + 1 + i, song == this.currentSong ? "rgb(255,100,0" : "rgb(255,255,255)");
        }

        this.filePositions = tempFilePos;
        //this.trackerStartIndex = this.player.sampleNum + 1;

        var pd = "";
        var pp, pdata;
        pdata = this.player.patternData(this.player.position);

        for (let i = 0; i < (pdata.length / (5 * this.player.channelsNum)); i++) {
            if (i < (this.player.row - this.markerIndex)) {
                continue;
            }

            pp = i * 5 * this.player.channelsNum;
            pd += hb(i) + "|";
            for (let c = 0; c < this.player.channelsNum; c++) {
                pd += notef(pdata[pp + c * 5 + 0], pdata[pp + c * 5 + 1], pdata[pp + c * 5 + 2], pdata[pp + c * 5 + 3], pdata[pp + c * 5 + 4]);
            }
            let isOnMarker = (i == this.player.row);;
            this.drawString(pd, 32, this.trackerStartIndex + this.markerIndex + i - this.player.row, isOnMarker ? "rgb(255,122,0)" : "rgb(255,255,255)");
            pd = "";
        }
    }
}

new XMPlayerApp().init();



var notes = ["C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"];
var volumeCommands = ["m", "v", "^", "-", "+", "s", "~", "p", "&lt;", "&gt;"]; // 0x5 .. 0xe


// note
// instrument
// volume
// command
// parameter
// channelsnum
function notef(note: number, sample: number, vol: number, command: number, param: number) {
    function pattNote(n) { return (n == 254) ? "===" : (notes[n & 0x0f] + (n >> 4)); }
    function pattVol(v) { return (v <= 0x40) ? hb(v) : (volumeCommands[(v - 0x50) >> 4] + hn(v & 0x0f)); }

    return ((note < 255) ? (pattNote(note) + " ") : ("... ")) + (sample ? (hb(sample) + " ") : (".. ")) +
        ((vol != 255) ? (pattVol(vol)+ " ") : (".. ")) + ((command != 0x2e) ? (String.fromCharCode(command) + hb(param)) : "...") + "|";    
}


function hn(n) {
    if (typeof n == "undefined") return "0";
    var s = (n & 0x0f).toString(16);
    return s.toUpperCase();
}

function hb(n) {
    if (typeof n == "undefined") return "00";
    var s = n.toString(16);
    if (s.length == 1) s = '0' + s;
    return s.toUpperCase();
}


function resizeCanvas(canvas: HTMLCanvasElement, virtualWidth: number, virtualHeight: number) {
    let scale: number;
    if (window.innerWidth / window.innerHeight > virtualWidth / virtualHeight) {
        scale = window.innerHeight / virtualHeight;
    }
    else {
        scale = window.innerWidth / virtualWidth;
    }

    var transform = "scale(" + scale + ")";
    canvas.style.setProperty("MozTransform", transform);
    canvas.style.setProperty("transform", transform);
    canvas.style.setProperty("WebkitTransform", transform);
    canvas.style.setProperty("top", ((scale - 1) * virtualHeight / 2) + "px");
    canvas.style.setProperty("left", ((scale - 1) * virtualWidth / 2 + (window.innerWidth - virtualWidth * scale) / 2) + "px");
};