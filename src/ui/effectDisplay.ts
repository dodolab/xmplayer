/** Decoded XM effect column: one letter + two hex digits (FT2 / classic tracker width). */
export function formatEffectCompact (commandByte: number, param: number): string {
	if (commandByte === 0x2e || commandByte === 46) return '...'
	const c = String.fromCharCode(commandByte)
	const s = param.toString(16)
	const hb = (s.length === 1 ? '0' + s : s).toUpperCase()
	return (c + hb).slice(0, 3)
}
