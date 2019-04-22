# XM PLAYER

Serverless player for XM tracker files. Contains a simple UI and XM engine, both written in *TypeScript*.

Uses Parcel Bundler as a local file server.

**Budget: ~150 hours of work.**

![XM Player screenshot](docs/screenshot.png)

## Installation
* create folder `assets/mods` and move your own files to this directory (only files with XM extension are supported). 
* type `npm install`
* type `npm start`
* `deploy.js` script is a NodeJS script that will go through all your XM files and create `files.json`. This file will be used by the UI player to select random files to play.
* connect to `localhost:1234/index.html`

## Architecture

* `UI` is very simple, uses WebCanvas and `Player` from `xmlib`
* `Player` uses `WebAudioAPI` for biquad filters and the `ScriptProcessorNode` for filling the output buffer. Everything else (including envelopes and effects) is implemented manually.
* `XMFile` is a structure of XM File
* `Parser` parses XM File from a binary file
* `Tracker` advances a context after each tick
* `Processor` is a sound processing engine
* `Mixer` mixes two channels and handles loops
* `Effects` contains implementation of effects as specified by XM format

![XM Architecture](docs/architecture.png)

## UI description

* UI is still work in progress. For now, only basics data is provided
* Max number of channels displayed is 6. XM format can have up to 32, though.

![UI legend](docs/xmplayer_ui.png)

## XM File structure

* Not sure if this is 100% correct. Original documentation can be found [here.](http://ftp.modland.com/pub/documents/format_documentation/FastTracker%202%20v2.04%20(.xm).html)

![XM File Structure](docs/xmfile_structure.png)

## TODO

* portamento doesn't sound properly for several tracks
* UI could benefit from certain attention
* not all effects are implemented
* big endian architectures are not yet supported

## License
--------

MIT License

Copyright (c) 2019 Adam Vesecký

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
