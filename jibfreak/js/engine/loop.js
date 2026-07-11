// ゲームループ。requestAnimationFrame ベースで、前フレームからの
// 経過時間(秒)を update に渡す。Diggy の「30FPSのsetInterval」と違い、
// 画面のリフレッシュに同期し、速度は dt に掛けて時間基準で決める。

/**
 * @param {{ update: (dt: number) => void, draw: () => void }} handlers
 */
export function startLoop(handlers) {
	let last = performance.now();
	/** @param {number} now */
	function frame(now) {
		// タブが背面に回って戻った直後の巨大な dt は上限で丸める
		const dt = Math.min((now - last) / 1000, 0.1);
		last = now;
		handlers.update(dt);
		handlers.draw();
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}
