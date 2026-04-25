import { formatEffectCompact } from './effectDisplay'

const notes = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-']
const volumeCommands = ['m', 'v', '^', '-', '+', 's', '~', 'p', '<', '>']

export function hn (n: number | undefined) {
	if (typeof n === 'undefined') return '0'
	const s = (n & 0x0f).toString(16)
	return s.toUpperCase()
}

export function hb (n: number | undefined) {
	if (typeof n === 'undefined') return '00'
	let s = n.toString(16)
	if (s.length === 1) s = '0' + s
	return s.toUpperCase()
}

export function notef (note: number, sample: number, vol: number, command: number, param: number): string {
	function pattNote (n: number) {
		return n === 254 ? '===' : `${notes[n & 0x0f]}${(n >> 4)}`
	}
	function pattVol (v: number) {
		return v <= 0x40 ? hb(v) : volumeCommands[(v - 0x50) >> 4] + hn(v & 0x0f)
	}

	const eff = formatEffectCompact(command, param)
	return (
		(note < 255 ? pattNote(note) + ' ' : '... ') +
		(sample ? hb(sample) + ' ' : '.. ') +
		(vol !== 255 ? pattVol(vol) + ' ' : '.. ') +
		eff +
		'|'
	)
}
