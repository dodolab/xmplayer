
// codepage 128x192, 16x16 -> 8x12px

import * as PIXI from 'pixi.js';
import XMPlayer from '../xmlib/player';

class XMPlayerApp {
    app: PIXI.Application = null;
    lastTime = 0;
    gameTime = 0;
    ticker: PIXI.ticker.Ticker = null;
    player: XMPlayer;
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;

    constructor(){
        this.init(<HTMLCanvasElement>document.getElementById('player'));
    }

    init(canvas: HTMLCanvasElement, resolution: number = 1) {
        this.canvas = canvas;

        /*this.app = new PIXI.Application({
            width: canvas.width / resolution,
            height: canvas.height / resolution,
            antialias: true,
            view: canvas,
            resolution: resolution // resolution/device pixel ratio
        });

        this.ticker = PIXI.ticker.shared;
        // stop the shared ticket and update it manually
        this.ticker.autoStart = false;
        this.ticker.stop();

        this.gfx = new PIXI.Graphics();

        document.body.addEventListener("mousedown", () => {
            this.player = new XMPlayer();
            this.player.load("assets/mods/Test Drive II.xm");
    
            this.player.onReady = () => {
                this.player.play();
            }
    
            this.player.onPlay = () => this.loop(0);
        });*/


        this.ctx = canvas.getContext("2d");
        this.ctx.font = "64px VGA";
       

        document.body.addEventListener("mousedown", () => {
            this.player = new XMPlayer();
            this.player.load("assets/mods/Test Drive II.xm");
    
            this.player.onReady = () => {
                this.player.play();
            }
    
            this.player.onPlay = () => this.loop(0);
        });
    }

    gfx: PIXI.Graphics;

    fontSize = 64;

    private drawString(str: string, posX: number, posY: number){
        this.ctx.fillStyle = "rgb(255,255,255)";
        this.ctx.fillText(str, this.fontSize + this.fontSize/2*posX, this.fontSize + this.fontSize/2*posY);
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

    private update(delta: number, absolute: number){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawString(this.player.row + ":" + this.player.position + "/" + this.player.songLength, 0, 0);
    }
}

new XMPlayerApp();
