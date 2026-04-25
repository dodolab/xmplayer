/**
 * Decode packed XM pattern data into a scratch buffer for UI display only.
 */
export function decodePatternToDisplayBuffer (
	source: Uint8Array,
	channelsNum: number,
	numRows: number
): Uint8Array {
	const out = new Uint8Array(source.length)
	out.set(source)
	const stride = 5 * channelsNum
	for (let row = 0; row < numRows; row++) {
		const base = row * stride
		for (let c = 0; c < channelsNum; c++) {
			const o = base + c * 5
			let note = out[o]
			if (note < 97) {
				note = (note % 12) | (Math.floor(note / 12) << 4)
			}
			out[o] = note
			let cmd = out[o + 3]
			if (cmd === 255) {
				cmd = 0x2e
			} else if (cmd < 0x0a) {
				cmd += 0x30
			} else {
				cmd += 0x41 - 0x0a
			}
			out[o + 3] = cmd
		}
	}
	return out
}
