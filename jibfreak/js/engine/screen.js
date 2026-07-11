// 画面。論理解像度 600x400 の canvas を1枚作り、
// ウィンドウの大きさに合わせて縦横比を保ったまま拡縮する。
// ゲーム側は常に 600x400 の座標系だけを考えればよい(MOBILE対応の土台)。

export const WIDTH = 600;
export const HEIGHT = 400;

/**
 * @param {HTMLElement} parent
 * @returns {CanvasRenderingContext2D}
 */
export function createScreen(parent) {
	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	parent.appendChild(canvas);

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas 2d context を取得できない');
	ctx.imageSmoothingEnabled = false; // ドット絵をにじませない

	function fit() {
		const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
		canvas.style.width = `${Math.floor(WIDTH * scale)}px`;
		canvas.style.height = `${Math.floor(HEIGHT * scale)}px`;
	}
	window.addEventListener('resize', fit);
	fit();

	return ctx;
}
