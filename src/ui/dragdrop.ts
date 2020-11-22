import { ModFile } from './modfile'

export default class DragDrop {
	isDragging: boolean
	onDropHandler: (file: ModFile) => void

	init (element: HTMLElement, onDropHandler: (file: ModFile) => void) {
		this.onDropHandler = onDropHandler;

		['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
			element.addEventListener(eventName, this.preventDefaults, false)
		})

		;['dragenter', 'dragover'].forEach(eventName => {
			element.addEventListener(eventName, this.onDragStart, false)
		})

		;['dragleave', 'drop'].forEach(eventName => {
			element.addEventListener(eventName, this.onDragEnd, false)
		})

		element.addEventListener('drop', this.onDrop, false)
	}

	onDragStart = () => {
		this.isDragging = true
	}

	onDragEnd = () => {
		this.isDragging = false
	}

	onDrop = (e: DragEvent) => {
		const dt = e.dataTransfer
		if (dt && dt.files) {
			for (let i = 0; i < dt.files.length; i++) {
				this.loadFile(dt.files[i])
			}
		}
	}

	loadFile (file: File) {
		file.arrayBuffer().then(buffer => {
			const modfile: ModFile = {
				name: file.name,
				size: file.size,
				path: '',
				buffer: new Uint8Array(buffer)
			}
			this.onDropHandler(modfile)
		}).catch(console.error)
	}

	preventDefaults (e: Event) {
		e.preventDefault()
		e.stopPropagation()
	}
}
