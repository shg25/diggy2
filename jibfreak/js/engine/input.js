// 入力。キーボードとタッチ(ポインタ)を「論理アクション」に束ねる。
// ゲーム側はデバイスを知らず、'action' や 'up' という意味だけを読む。
// キー割り当ての変更・ゲームパッド対応はこのファイルだけで済む。

/** @type {Record<string, string[]>} 論理アクション → 物理キー */
const BINDINGS = {
	action: [' ', 'Enter'],
	up: ['ArrowUp'],
	down: ['ArrowDown'],
	left: ['ArrowLeft'],
	right: ['ArrowRight'],
	shot: ['z', 'Z'], // 隠しコマンド: ショット変更
	speed: ['s', 'S'], // 隠しコマンド: スピード変更
	bomb: ['b', 'B'], // 隠しコマンド: ボム
	pause: ['p', 'P'],
	mute: ['m', 'M'],
};

/** @type {Set<string>} いま押されているキー */
const down = new Set();
/** @type {Set<string>} このフレームで押された瞬間のキー */
const pressed = new Set();
let pointerPressed = false;

export function initInput() {
	window.addEventListener('keydown', (e) => {
		if (!down.has(e.key)) pressed.add(e.key);
		down.add(e.key);
	});
	window.addEventListener('keyup', (e) => down.delete(e.key));
	window.addEventListener('pointerdown', () => {
		pointerPressed = true;
	});
}

/** 押しっぱなし判定 @param {string} action */
export function isDown(action) {
	return (BINDINGS[action] ?? []).some((k) => down.has(k));
}

/** 押した瞬間だけ true。タッチは 'action' として扱う @param {string} action */
export function wasPressed(action) {
	if (action === 'action' && pointerPressed) return true;
	return (BINDINGS[action] ?? []).some((k) => pressed.has(k));
}

/** 「押した瞬間」情報を消す。毎フレームの update 末尾で呼ぶ */
export function flushInput() {
	pressed.clear();
	pointerPressed = false;
}
