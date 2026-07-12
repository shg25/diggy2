// 1面ボス。classic の sprite.js(newSpriteBoss の1面分岐, makeBossSh1,
// getoutBoss) から移植。
//
// classic からの意図的な変更が1つ: 撃破時に transitions.win() を呼ぶ。
// classic には goWin(YOU WIN の演出一式)が完全に作り込まれていたのに、
// どこからも呼ばれていなかった——20年間、誰も勝てないゲームだった。
// 新版では当時の意図どおりに配線する。
import { state } from './state.js';
import { FPS, BAN_DURATION_MS } from './const.js';
import { BOSS_DEFS } from './defs.js';
import { advance, isOutOfBounds, isTouching } from './entity.js';
import { STEP_COME, STEP_BATTLE, stepFlg, isFight, transitions } from './flow.js';
import { jiki, jikiSh1, jikiSh3 } from './player.js';
import { addScore } from './hud.js';
import { BAN_IMAGE } from './defs.js';

export const BOSS_IMAGE = 'gfx/teki/60/l.gif';
export const BOSS_SH_IMAGE = 'gfx/teki/60/s1.gif';
export const BOSS_LASER_IMAGE = 'gfx/teki/60/s2.gif';

const TICK = 1 / FPS;

/** @typedef {import('./entity.js').Entity & { life: number, score: number, dieTimer: number }} Boss */

/** @type {Boss | null} */
export let boss = null;

/** @type {import('./entity.js').Entity[]} ボス弾(classic の groupBossSh) */
export const bossShots = [];

export function resetBoss() {
	boss = null;
	bossShots.length = 0;
}

/** ボムで消される(classic の rmGroupTeki のボス弾消去) */
export function clearBossShots() {
	bossShots.length = 0;
}

// ボス登場(classic の newSpriteBoss の1面分)
export function spawnBoss() {
	const def = BOSS_DEFS[0];
	boss = {
		x: def.x,
		y: def.y,
		width: def.width,
		height: def.height,
		velocity: def.velocity,
		angle: def.angle,
		active: true,
		imageKey: BOSS_IMAGE,
		life: 20,
		score: 5000,
		dieTimer: 0,
	};
}

/** 負けたときボスが飛び去る(classic の getoutBoss) */
export function getoutBoss() {
	if (boss && boss.dieTimer === 0) boss.angle = 20;
}

/** 撃破: classic の banSprite + 新規配線の transitions.win() */
function banBoss() {
	if (!boss || boss.dieTimer > 0) return; // 二重撃破(同フレーム多段ヒット)を防ぐ
	addScore(boss.score);
	boss.velocity = 0;
	boss.imageKey = BAN_IMAGE;
	boss.dieTimer = BAN_DURATION_MS / 1000;
	transitions.win(); // classic では欠けていた配線
}

/**
 * 自機ショットとの当たり判定。後方ショット(jikiSh2)はボスに
 * 当たらない仕様、レーザーはダメージ0.2(どちらも classic のまま)
 * @param {Boss} b
 * @param {boolean} pierce
 * @param {import('./entity.js').Entity[]} pool
 * @param {number} damage
 */
function hitJikiSh(b, pierce, pool, damage) {
	for (const shot of pool) {
		if (shot.active && isTouching(b, shot)) {
			b.life -= damage;
			if (!pierce) shot.active = false;
			if (b.life <= 0) banBoss();
			return;
		}
	}
}

// 1面のボス弾(classic の makeBossSh1 から移植)
/** @param {number} num 発射カウント(角度と発射口が交互に変わる) */
export function makeBossSh1(num) {
	if (!boss || boss.dieTimer > 0) return;

	let angBossSh;
	let xBossSh;
	let yBossSh;
	if (num % 2 === 0) {
		angBossSh = num * 10;
		xBossSh = 65;
		yBossSh = 55;
	} else {
		angBossSh = num * -10;
		xBossSh = 205;
		yBossSh = 35;
	}
	bossShots.push({
		x: boss.x + xBossSh,
		y: boss.y + yBossSh,
		width: 4,
		height: 4,
		velocity: 2,
		angle: angBossSh,
		active: true,
		imageKey: BOSS_SH_IMAGE,
	});

	if (num % 30 === 0 && stepFlg === STEP_BATTLE) {
		bossShots.push({
			x: boss.x - 120,
			y: boss.y + 45,
			width: 128,
			height: 2,
			velocity: 4,
			angle: 10,
			active: true,
			imageKey: BOSS_LASER_IMAGE,
		});
	}
}

/** 自機との接触 @param {import('./entity.js').Entity | Boss} e */
function touchJiki(e) {
	if (state.muteki) return;
	if (!isFight()) return;
	if (!isTouching(e, jiki)) return;
	transitions.lose();
}

// 30Hz の1フレーム分(classic のボス ping + ボス弾 ping 相当)
export function tickBoss() {
	if (boss) {
		if (boss.dieTimer > 0) {
			boss.dieTimer -= TICK;
			if (boss.dieTimer <= 0) boss = null;
		} else {
			advance(boss, TICK);
			if (isOutOfBounds(boss)) {
				boss = null; // 飛び去った(classic の remove)
			} else {
				// 後方ショット(jikiSh2)はボスに当たらない仕様
				hitJikiSh(boss, false, jikiSh1, 1);
				if (boss) hitJikiSh(boss, true, jikiSh3, 0.2);
				if (boss && boss.dieTimer === 0) {
					touchJiki(boss);
					if (stepFlg === STEP_COME && boss.x >= 310) {
						// 後進
						boss.angle = 90;
						transitions.battle();
					}
					if (stepFlg === STEP_BATTLE) {
						// 上下移動
						if (boss.y <= 50) boss.angle = 270;
						if (boss.y >= 300) boss.angle = 90;
					}
				}
			}
		}
	}

	for (let i = bossShots.length - 1; i >= 0; i--) {
		const s = bossShots[i];
		advance(s, TICK);
		if (isOutOfBounds(s)) {
			bossShots.splice(i, 1);
			continue;
		}
		touchJiki(s);
	}
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, HTMLImageElement>} images
 */
export function drawBoss(ctx, images) {
	for (const s of bossShots) {
		ctx.drawImage(images[s.imageKey], Math.round(s.x), Math.round(s.y));
	}
	if (boss) {
		ctx.drawImage(images[boss.imageKey], Math.round(boss.x), Math.round(boss.y));
	}
}
