import type XMPlayer from '../xmlib/player'
import { PlayerState } from '../xmlib/player'

export type KeyboardContext = {
	player: XMPlayer
	onPrevOrder: () => void
	onNextOrder: () => void
	onBpmDelta: (d: number) => void
	onSpeedDelta: (d: number) => void
}

export function attachKeyboard (ctx: KeyboardContext) {
	const down = (e: KeyboardEvent) => {
		const k = e.key
		const p = ctx.player
		if (k === ' ' || k === 'Spacebar') {
			e.preventDefault()
			if (p.state === PlayerState.PLAYING) p.pause()
			else if (p.state === PlayerState.PAUSED || p.state === PlayerState.READY || p.state === PlayerState.STOPPED) {
				p.play()
			}
			return
		}
		if (k === 'F5') {
			e.preventDefault()
			p.stop(false)
			return
		}
		if (k === 'F6') {
			e.preventDefault()
			p.play()
			return
		}
		if (k === 'ArrowLeft') {
			e.preventDefault()
			ctx.onPrevOrder()
			return
		}
		if (k === 'ArrowRight') {
			e.preventDefault()
			ctx.onNextOrder()
			return
		}
		if (k === 'ArrowUp') {
			e.preventDefault()
			ctx.onBpmDelta(1)
			return
		}
		if (k === 'ArrowDown') {
			e.preventDefault()
			ctx.onBpmDelta(-1)
			return
		}
		if (k === '[') {
			e.preventDefault()
			ctx.onSpeedDelta(-1)
			return
		}
		if (k === ']') {
			e.preventDefault()
			ctx.onSpeedDelta(1)
			return
		}
		const n = k >= '1' && k <= '9' ? parseInt(k, 10) - 1 : k === '0' ? 9 : -1
		if (n >= 0 && n < p.channelsNum) {
			e.preventDefault()
			p.toggleChannelMute(n)
		}
	}
	window.addEventListener('keydown', down)
	return () => window.removeEventListener('keydown', down)
}
