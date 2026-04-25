// recalculates client coordinates to virtual coordinates
export function clientToVirtual (
	clientX: number,
	clientY: number,
	canvas: HTMLCanvasElement,
	virtualWidth: number,
	virtualHeight: number
): { x: number; y: number } {
	const r = canvas.getBoundingClientRect()
	const x = ((clientX - r.left) / r.width) * virtualWidth
	const y = ((clientY - r.top) / r.height) * virtualHeight
	return { x, y }
}
