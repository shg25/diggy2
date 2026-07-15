// 画面。論理解像度 600x400 の canvas を1枚作り、
// ウィンドウの大きさに合わせて縦横比を保ったまま拡縮する。
// ゲーム側は常に 600x400 の座標系だけを考えればよい(MOBILE対応の土台)。

export const WIDTH = 600;
export const HEIGHT = 400;

/** @type {HTMLCanvasElement | null} */
let screenCanvas = null;

/**
 * ページ上の座標(clientX/Y)を、canvas の論理座標(600x400)に変換する。
 * タッチ入力の位置判定に使う
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ x: number, y: number }}
 */
export function toLogical(clientX, clientY) {
	if (!screenCanvas) return { x: 0, y: 0 };
	const rect = screenCanvas.getBoundingClientRect();
	return {
		x: ((clientX - rect.left) / rect.width) * WIDTH,
		y: ((clientY - rect.top) / rect.height) * HEIGHT,
	};
}

/** クライアント座標の距離を論理座標の距離に換算する係数 @returns {number} */
export function logicalScale() {
	if (!screenCanvas) return 1;
	return WIDTH / screenCanvas.getBoundingClientRect().width;
}

/**
 * @param {HTMLElement} parent
 * @returns {CanvasRenderingContext2D}
 */
export function createScreen(parent) {
	const canvas = document.createElement('canvas');
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	parent.appendChild(canvas);
	screenCanvas = canvas;

	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas 2d context を取得できない');
	ctx.imageSmoothingEnabled = false; // ドット絵をにじませない

	function fit() {
		// innerWidth はコンテンツのはみ出しでズームが変わると値も変わる
		// (はみ出し→ズーム→再計算…の循環)。ズームの影響を受けない
		// レイアウトビューポート(documentElement.client*)を基準にする
		const el = document.documentElement;
		const scale = Math.min(el.clientWidth / WIDTH, el.clientHeight / HEIGHT);
		canvas.style.width = `${Math.floor(WIDTH * scale)}px`;
		canvas.style.height = `${Math.floor(HEIGHT * scale)}px`;
	}
	window.addEventListener('resize', fit);
	// スマホはビューポートの確定がスクリプト実行より遅れることがあり、
	// 初回の fit が古い寸法で計算される(canvas が画面からはみ出す)。
	// レイアウト確定後にもう一度合わせ、visualViewport の変化にも追従する
	window.addEventListener('load', fit);
	if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
	fit();
	requestAnimationFrame(fit);

	return ctx;
}
