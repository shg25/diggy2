// 雑魚敵。classic の sprite.js(makeTeki1, hitJikiSh, banSprite, touchJiki) と
// stage.js(stage1 の湧きロジック) から移植。
//
// 物理と判定は 30Hz の固定tickで回す。classic の湧き確率(毎フレーム1/20)や
// 端での跳ね返り(angle×-0.7)は「30fpsのフレームごと」に調整された数値で、
// 可変フレームレートに直接載せると別のゲームになってしまうため。
//
// classic からの意図的な変更が1つ: numTeki の増減を両方このファイルが持つ。
// classic は「減算は敵自身、加算は呼び出し側」という非対称な契約で、
// テストがその罠を踏んだ(レッスン15)。新築では生成する者が数える。
import { state } from './state.js';
import { FPS, TEKI1_SPAWN_RATE, BAN_DURATION_MS, BOMB_DURATION_MS } from './const.js';
import { TEKI1_DEFS, BAN_IMAGE } from './defs.js';
import { advance, isOutOfBounds, isTouching, randInt } from './entity.js';
import { frameOf } from './engine/assets.js';
import { play } from './engine/sound.js';
import { WIDTH, HEIGHT } from './engine/screen.js';
import { isFight, transitions } from './flow.js';
import { jiki, jikiSh1, jikiSh2, jikiSh3 } from './player.js';
import { addScore } from './hud.js';
import { boss, clearBossShots } from './boss.js';

/** @typedef {import('./entity.js').Entity & { life: number, score: number, dieTimer: number }} Teki */

/** @type {Teki[]} */
export const tekis = [];

/** @type {(Teki & { turn: 'up' | 'down' }) | null} 2面の敵「とぅと郎」。1体だけ */
export let teki2 = null;

const TICK = 1 / FPS;

export function resetTekis() {
	tekis.length = 0;
	teki2 = null;
	state.numTeki = 0;
}

// 1面の敵機作る(classic の makeTeki1 から移植)
export function spawnTeki1() {
	const n = Math.floor(Math.random() * TEKI1_DEFS.length);
	const def = TEKI1_DEFS[n];
	let velocity = def.velocity;
	const angle = Math.floor(Math.random() * def.angRange) - def.angRange / 2;
	const lr = Math.floor(Math.random() * 2);
	let lrTeki;
	let x;
	if (lr === 0) {
		lrTeki = 'l';
		x = WIDTH;
	} else {
		lrTeki = 'r';
		x = -16;
		velocity = velocity * -0.4;
	}
	tekis.push({
		x,
		y: randInt(jiki.height, HEIGHT - 100),
		width: def.width,
		height: def.height,
		velocity,
		angle,
		active: true,
		imageKey: `gfx/teki/${n}/${lrTeki}.gif`,
		life: def.life,
		score: def.score,
		dieTimer: 0,
	});
	state.numTeki++; // 生成する者が数える
}

/** 撃破: スコアを入れて、やられ演出(ban.gif)を出して消す */
/** @param {Teki} t */
function banTeki(t) {
	state.numTeki--;
	addScore(t.score);
	t.velocity = 0;
	t.imageKey = BAN_IMAGE;
	t.dieTimer = BAN_DURATION_MS / 1000;
	play('explosion');
}

/**
 * 自機ショットとの当たり判定(classic の hitJikiSh から移植)
 * @param {Teki} t
 * @param {boolean} pierce レーザーは敵に当たっても消えない
 * @param {import('./entity.js').Entity[]} pool
 * @param {number} damage
 */
function hitJikiSh(t, pierce, pool, damage) {
	for (const shot of pool) {
		if (shot.active && isTouching(t, shot)) {
			t.life -= damage;
			if (!pierce) {
				shot.active = false;
			}
			if (t.life <= 0) banTeki(t);
			return;
		}
	}
}

/**
 * 全ショットとの当たり判定(classic の hitAllJikiSh から移植)
 * @param {Teki} t
 * @param {number} laserDamage
 */
function hitAllJikiSh(t, laserDamage) {
	hitJikiSh(t, false, jikiSh1, 1);
	hitJikiSh(t, false, jikiSh2, 1);
	hitJikiSh(t, true, jikiSh3, laserDamage);
}

/** 自機との接触(classic の touchJiki から移植) @param {Teki} t */
function touchJiki(t) {
	if (state.muteki) return; // デバッグ用無敵
	if (!isFight()) return;
	if (!isTouching(t, jiki)) return;
	transitions.lose();
}

// とぅと郎(classic の newSpriteTeki2 から移植)。
// classic はとぅと郎を numTeki に数え入れないのに撃破時に減らす非対称が
// あった(実害なし・温存)。新築では生成する者が数える。
export function spawnTeki2() {
	teki2 = {
		x: 599,
		y: 200,
		width: 32,
		height: 32,
		velocity: 5,
		angle: 0,
		active: true,
		imageKey: 'gfx/teki/20/l.gif',
		life: 90,
		score: 5000,
		dieTimer: 0,
		turn: 'up',
	};
	state.numTeki++;
}

// classic の moveTeki2 + とぅと郎の ping 相当(30Hzで呼ぶ)
export function tickTeki2() {
	if (!teki2) return;
	if (teki2.dieTimer > 0) {
		teki2.dieTimer -= TICK;
		if (teki2.dieTimer <= 0) teki2 = null;
		return;
	}

	// 首振り(classic の moveTeki2)
	if (teki2.angle >= 80) teki2.turn = 'down';
	else if (teki2.angle <= -80) teki2.turn = 'up';
	if (teki2.turn === 'up') teki2.angle += 5;
	else teki2.angle -= 5;
	if (teki2.x >= 500) {
		teki2.velocity = 5;
		teki2.imageKey = 'gfx/teki/20/l.gif';
	} else if (teki2.x <= 100) {
		teki2.velocity = -5;
		teki2.imageKey = 'gfx/teki/20/r.gif';
	}

	advance(teki2, TICK);
	if (isOutOfBounds(teki2)) {
		state.numTeki--;
		teki2 = null;
		return;
	}
	hitAllJikiSh(teki2, 0.8);
	if (teki2 && teki2.dieTimer === 0) touchJiki(teki2);
}

// ボム(classic の rmGroupTeki から移植)。BOMB_DURATION_MS の間、
// 雑魚が触れただけで消えるフラグを立てる。ボス弾の消去はボス移植時に追加
export function rmGroupTeki() {
	if (boss) clearBossShots(); // classic: ボスがいる間はボス弾も消す
	state.bombTeki = 1;
	setTimeout(() => {
		state.bombTeki = 0;
	}, BOMB_DURATION_MS);
}

// 30Hz の1フレーム分(classic の stage1 interval + 各スプライトの ping 相当)
export function tickTekis() {
	// 湧き: 敵が0なら必ず、それ以外は毎フレーム 1/TEKI1_SPAWN_RATE の確率(1面のみ)
	if (isFight() && state.stageFlg === 1) {
		if (state.numTeki === 0 || randInt(1, TEKI1_SPAWN_RATE) === 1) spawnTeki1();
	}

	for (let i = tekis.length - 1; i >= 0; i--) {
		const t = tekis[i];
		if (t.dieTimer > 0) {
			t.dieTimer -= TICK;
			if (t.dieTimer <= 0) tekis.splice(i, 1);
			continue;
		}
		advance(t, TICK);
		if (isOutOfBounds(t)) {
			state.numTeki--;
			tekis.splice(i, 1);
			continue;
		}
		if (state.bombTeki === 1) {
			banTeki(t); // ボム有効中は触れただけで消える(classic)
			continue;
		}
		hitAllJikiSh(t, 0.8);
		if (t.dieTimer > 0) continue; // このtickで撃破された
		touchJiki(t);

		// 上下端で角度速度を鋭利に(classic)
		if (t.y >= 352 || t.y <= 16) {
			t.angle = t.angle * -0.7;
			t.velocity = t.velocity * 1.3;
		}
	}
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, import('./engine/assets.js').Anim>} images
 * @param {number} tMs アニメーション時刻(ミリ秒)
 */
export function drawTekis(ctx, images, tMs) {
	for (const t of tekis) {
		ctx.drawImage(frameOf(images[t.imageKey], tMs), Math.round(t.x), Math.round(t.y));
	}
	if (teki2) {
		ctx.drawImage(frameOf(images[teki2.imageKey], tMs), Math.round(teki2.x), Math.round(teki2.y));
	}
}
