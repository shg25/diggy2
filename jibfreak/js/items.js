// パワーアップアイテム。classic の sprite.js(makePwr, touchJiki のアイテム分岐)
// から移植。取ると [0]:ショット変更 [1]:スピード変更 [2]:ボム。
// 画面外に消えるときに numTeki は触らない(classic のレッスン05で直したバグを
// 新築では最初から作らない)。
import { state } from './state.js';
import { PWR_SPAWN_RATE } from './const.js';
import { PWR_DEFS } from './defs.js';
import { advance, isOutOfBounds, isTouching, randInt } from './entity.js';
import { WIDTH, HEIGHT } from './engine/screen.js';
import { isFight } from './flow.js';
import { jiki, chJikiSh, chVelJiki } from './player.js';
import { rmGroupTeki } from './enemies.js';

/** @typedef {import('./entity.js').Entity & { n: number }} Pwr */

/** @type {Pwr[]} */
export const pwrs = [];

export function resetPwrs() {
	pwrs.length = 0;
}

// パワーアップアイテム作る(classic の makePwr から移植)
export function spawnPwr() {
	const n = Math.floor(Math.random() * PWR_DEFS.length);
	const def = PWR_DEFS[n];
	let velocity = def.velocity;
	const lr = Math.floor(Math.random() * 2);
	let x;
	if (lr === 0) {
		x = WIDTH;
	} else {
		x = -16;
		velocity = velocity * -0.4;
	}
	pwrs.push({
		x,
		y: randInt(jiki.height, HEIGHT - 100),
		width: def.width,
		height: def.height,
		velocity,
		angle: 0,
		active: true,
		imageKey: `gfx/teki/${n + 80}/l.gif`,
		n,
	});
}

/** 取得効果(classic の touchJiki のアイテム分岐から移植) @param {Pwr} p */
function applyPwr(p) {
	if (p.n === 0) chJikiSh();
	else if (p.n === 1) chVelJiki();
	else rmGroupTeki();
}

// 30Hz の1フレーム分(classic の stage1 interval のアイテム分 + ping 相当)
export function tickPwrs() {
	// 湧き: 毎フレーム 1/PWR_SPAWN_RATE の確率
	if (isFight() && randInt(1, PWR_SPAWN_RATE) === 1) spawnPwr();

	const TICK = 1 / 30;
	for (let i = pwrs.length - 1; i >= 0; i--) {
		const p = pwrs[i];
		advance(p, TICK);
		if (isOutOfBounds(p)) {
			pwrs.splice(i, 1); // アイテムは敵数(numTeki)に入っていないので触らない
			continue;
		}
		if (state.muteki) continue; // デバッグ用無敵中は接触処理ごとスキップ(classicと同じ)
		if (!isFight()) continue;
		if (isTouching(p, jiki)) {
			pwrs.splice(i, 1);
			applyPwr(p);
		}
	}
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, HTMLImageElement>} images
 */
export function drawPwrs(ctx, images) {
	for (const p of pwrs) {
		ctx.drawImage(images[p.imageKey], Math.round(p.x), Math.round(p.y));
	}
}
