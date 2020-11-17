// amiga period value table for PAL machine
// 105 notes, spanned over 8 finetunes
const periodtable = [
	//   -8     -7     -6     -5     -4     -3     -2     -1
	//    0      1      2      3      4      5      6      7
	907.0, 900.0, 894.0, 887.0, 881.0, 875.0, 868.0, 862.0, // B-3
	856.0, 850.0, 844.0, 838.0, 832.0, 826.0, 820.0, 814.0, // C-4
	808.0, 802.0, 796.0, 791.0, 785.0, 779.0, 774.0, 768.0, // C#4
	762.0, 757.0, 752.0, 746.0, 741.0, 736.0, 730.0, 725.0, // D-4
	720.0, 715.0, 709.0, 704.0, 699.0, 694.0, 689.0, 684.0, // D#4
	678.0, 675.0, 670.0, 665.0, 660.0, 655.0, 651.0, 646.0, // E-4
	640.0, 636.0, 632.0, 628.0, 623.0, 619.0, 614.0, 610.0, // F-4
	604.0, 601.0, 597.0, 592.0, 588.0, 584.0, 580.0, 575.0, // F#4
	570.0, 567.0, 563.0, 559.0, 555.0, 551.0, 547.0, 543.0, // G-4
	538.0, 535.0, 532.0, 528.0, 524.0, 520.0, 516.0, 513.0, // G#4
	508.0, 505.0, 502.0, 498.0, 494.0, 491.0, 487.0, 484.0, // A-4
	480.0, 477.0, 474.0, 470.0, 467.0, 463.0, 460.0, 457.0, // A#4
	453.0, 450.0, 447.0, 445.0, 442.0, 439.0, 436.0, 433.0, // B-4
	428.0
]

/**
 * Calculates period value for a note (amiga used weird base frequency)
 * when samples are bounced down, they should fit a chip sample rate
 * @param note note value
 * @param fineTune fine tune value
 * @param amigaPeriods if true, amiga periodic table will be used
 */
export function calcPeriod (note: number, fineTune: number, amigaPeriods: boolean): number {
	if (amigaPeriods) {
		let ft = Math.floor(fineTune / 16.0) // = -8 .. 7
		const period1 = periodtable[8 + (note % 12) * 8 + ft]
		const period2 = periodtable[8 + (note % 12) * 8 + ft + 1]
		ft = (fineTune / 16.0) - ft
		return ((1.0 - ft) * period1 + ft * period2) * (16.0 / Math.pow(2, Math.floor(note / 12) - 1))
	} else {
		// linear period, max is 7680
		return 7680.0 - note * 64.0 - fineTune / 2
	}
}
