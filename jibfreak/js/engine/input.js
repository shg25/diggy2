// 入力。キーボードとタッチ(ポインタ)を「論理アクション」に束ねる。
// ゲーム側はデバイスを知らず、'action' や 'up' という意味だけを読む。
// キー割り当ての変更・ゲームパッド対応はこのファイルだけで済む。
//
// タッチ(第5回生徒会):
// - ドラッグ相対移動: 指の移動量を consumePointerDelta() で取り出す
// - 触れている間 = isPointerDown() (自動射撃に使う)
// - タップ位置は consumeTaps() で論理座標として取り出し、
//   画面上のボタンやメニューの判定はゲーム側が行う
import { toLogical, logicalScale } from './screen.js';

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

// ポインタ(タッチ/マウス)の状態
let pointerId = -1;
let pointerSuppressed = false; // ボタンを押した指はドラッグ・射撃に使わない
let lastX = 0;
let lastY = 0;
let deltaX = 0;
let deltaY = 0;
let pointerFresh = false; // このフレームで触れた瞬間か
/** @type {{ x: number, y: number }[]} このフレームのタップ位置(論理座標) */
let taps = [];

export function initInput() {
	window.addEventListener('keydown', (e) => {
		if (!down.has(e.key)) pressed.add(e.key);
		down.add(e.key);
	});
	window.addEventListener('keyup', (e) => down.delete(e.key));

	window.addEventListener('pointerdown', (e) => {
		if (pointerId !== -1) return; // 1本目の指だけを追う
		pointerId = e.pointerId;
		pointerSuppressed = false;
		pointerFresh = true;
		lastX = e.clientX;
		lastY = e.clientY;
		taps.push(toLogical(e.clientX, e.clientY));
	});
	window.addEventListener('pointermove', (e) => {
		if (e.pointerId !== pointerId || pointerSuppressed) return;
		deltaX += (e.clientX - lastX) * logicalScale();
		deltaY += (e.clientY - lastY) * logicalScale();
		lastX = e.clientX;
		lastY = e.clientY;
	});
	const end = (/** @type {PointerEvent} */ e) => {
		if (e.pointerId === pointerId) pointerId = -1;
	};
	window.addEventListener('pointerup', end);
	window.addEventListener('pointercancel', end);
}

/** 押しっぱなし判定 @param {string} action */
export function isDown(action) {
	return (BINDINGS[action] ?? []).some((k) => down.has(k));
}

/** 押した瞬間だけ true @param {string} action */
export function wasPressed(action) {
	return (BINDINGS[action] ?? []).some((k) => pressed.has(k));
}

/** 指(ポインタ)が触れているか(画面上ボタンに使った指は除く) */
export function isPointerDown() {
	return pointerId !== -1 && !pointerSuppressed;
}

/** このフレームで指が触れた瞬間か */
export function wasPointerPressed() {
	return pointerFresh && !pointerSuppressed;
}

/** このフレームの指の移動量(論理座標)を取り出す */
export function consumePointerDelta() {
	const d = { dx: deltaX, dy: deltaY };
	deltaX = 0;
	deltaY = 0;
	return d;
}

/** このフレームのタップ位置(論理座標)を取り出す */
export function consumeTaps() {
	const t = taps;
	taps = [];
	return t;
}

/** いま触れている指を「ボタン用」として以後のドラッグ・射撃から除外する */
export function suppressCurrentPointer() {
	pointerSuppressed = true;
	deltaX = 0;
	deltaY = 0;
}

/** 「押した瞬間」情報を消す。毎フレームの update 末尾で呼ぶ */
export function flushInput() {
	pressed.clear();
	pointerFresh = false;
	taps = [];
}
