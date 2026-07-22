// 1面ボス。classic の sprite.js(newSpriteBoss の1面分岐, makeBossSh1,
// getoutBoss) から移植。
//
// classic からの意図的な変更が1つ: 撃破時に transitions.win() を呼ぶ。
// classic には goWin(YOU WIN の演出一式)が完全に作り込まれていたのに、
// どこからも呼ばれていなかった——20年間、誰も勝てないゲームだった。
// 新版では当時の意図どおりに配線する。
import { state } from './state.js';
import { FPS, BAN_DURATION_MS } from './const.js';
import { BOSS_DEFS, HIT_DEFS } from './defs.js';
import { advance, isOutOfBounds, isTouching, centerBox, randInt } from './entity.js';
import { frameOf } from './engine/assets.js';
import { play } from './engine/sound.js';
import { STEP_COME, STEP_BATTLE, stepFlg, isFight, transitions } from './flow.js';
import { jiki, jikiHitbox, jikiSh1, jikiSh3 } from './player.js';
import { addScore } from './hud.js';
import { BAN_IMAGE } from './defs.js';

export const BOSS_IMAGE = 'gfx/teki/60/l.gif';
export const BOSS_SH_IMAGE = 'gfx/teki/60/s1.gif';
export const BOSS_LASER_IMAGE = 'gfx/teki/60/s2.gif';
// 2面ボス(猫バス)と弾の画像
export const BOSS2_IMAGES = [
	'gfx/teki/61/l.gif',
	'gfx/teki/61/r.gif',
	'gfx/teki/61/l_1.gif',
	'gfx/teki/61/l_2.gif',
	'gfx/teki/61/l_3.gif',
	'gfx/teki/61/s0.gif',
	'gfx/teki/61/s1.gif',
];

const TICK = 1 / FPS;

/**
 * @typedef {import('./entity.js').Entity & {
 *   life: number, score: number, dieTimer: number,
 *   n: number, turnDir: 'r' | 'l', turnMode: number, laserWarn: boolean
 * }} Boss
 * n: ステージ番号-1。turnDir/turnMode: 2面の暴れ状態。
 * classic ではグローバル変数(bossTurn/bossTurnMode)だったが、
 * ボス自身の状態なのでボスに持たせる
 */

/** @type {Boss | null} */
export let boss = null;

/**
 * @typedef {import('./entity.js').Entity & {
 *   n?: number, life?: number, homing?: 'charging' | 'done', laser?: boolean, ageTicks?: number
 * }} BossShot
 * homing: 2面の追尾弾の状態。classic では全弾共有のグローバル turn
 * だったが(レッスン03で指摘した wart)、弾ごとに持つ。
 * laser/ageTicks: 1面レーザーが砲口からじわっと伸びる演出用(大掃除#1)
 */

/** @type {BossShot[]} ボス弾(classic の groupBossSh) */
export const bossShots = [];

export function resetBoss() {
	boss = null;
	bossShots.length = 0;
}

/** ボムで消される(classic の rmGroupTeki のボス弾消去) */
export function clearBossShots() {
	bossShots.length = 0;
}

// ボス登場(classic の newSpriteBoss から移植)
export function spawnBoss() {
	const n = state.stageFlg !== 1 ? 1 : 0;
	const def = BOSS_DEFS[n];
	boss = {
		x: def.x,
		y: def.y,
		width: def.width,
		height: def.height,
		velocity: def.velocity,
		angle: def.angle,
		active: true,
		imageKey: `gfx/teki/${n + 60}/l.gif`,
		life: 20,
		score: 5000,
		dieTimer: 0,
		n,
		turnDir: 'l',
		turnMode: 0,
		laserWarn: false,
	};
}

/** 負けたときボスが飛び去る(classic の getoutBoss。1面のみ) */
export function getoutBoss() {
	if (state.stageFlg !== 1) return;
	if (boss && boss.dieTimer === 0) boss.angle = 20;
}

/** 撃破: classic の banSprite + 新規配線の transitions.win() */
function banBoss() {
	if (!boss || boss.dieTimer > 0) return; // 二重撃破(同フレーム多段ヒット)を防ぐ
	addScore(boss.score);
	boss.velocity = 0;
	boss.imageKey = BAN_IMAGE;
	boss.dieTimer = BAN_DURATION_MS / 1000;
	play('explosion');
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

	// レーザーの溜め予告(大掃除#1・会長「唐突に見える」)。
	// 発射(num%30===0)の約0.5秒前から砲口と射線を予告する
	boss.laserWarn = stepFlg === STEP_BATTLE && num % 30 >= 23;

	if (num % 30 === 0 && stepFlg === STEP_BATTLE) {
		bossShots.push({
			x: boss.x - 120,
			y: boss.y + 45,
			width: 128,
			// 大掃除#1(外部顧問の指摘): 判定2pxは画像(128x8)の1/4しかなく、
			// 自機の弱点8x8化以降ほぼ当たらない飾りだった。見た目に合わせる
			height: 8,
			velocity: 4,
			angle: 10,
			active: true,
			imageKey: BOSS_LASER_IMAGE,
			laser: true,
			ageTicks: 0,
		});
	}
}

// レーザーが砲口からじわっと伸びるのにかける tick 数(30Hz基準・約0.2秒)
const LASER_GROW_TICKS = 6;

/**
 * ボスの体当たり判定(第6回生徒会)。画像より各辺 16px 狭い——
 * 画像矩形のままだと透明部分に触れて死ぬ理不尽があった。
 * 猫バスの縦向き(width/height が入れ替わる)にもそのまま追従する
 * @param {Boss} b
 */
export function bossBodyBox(b) {
	const m = HIT_DEFS.bossBodyMargin;
	return centerBox(b, b.width - m * 2, b.height - m * 2);
}

/**
 * 自機との接触。自機側は中央 8x8 の弱点だけを見る
 * @param {{ x: number, y: number, width: number, height: number }} e 判定矩形
 */
function touchJiki(e) {
	if (state.muteki) return;
	if (!isFight()) return;
	if (!isTouching(e, jikiHitbox())) return;
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
			// 画面外で消えるのは1面のみ(2面の猫バスは画面外まで往復する仕様)
			if (boss.n === 0 && isOutOfBounds(boss)) {
				boss = null; // 飛び去った(classic の remove)
			} else {
				// 後方ショット(jikiSh2)はボスに当たらない仕様
				hitJikiSh(boss, false, jikiSh1, 1);
				if (boss) hitJikiSh(boss, true, jikiSh3, 0.2);
				if (boss && boss.dieTimer === 0) {
					touchJiki(bossBodyBox(boss));
					if (boss.n === 0) tickBoss1(boss);
					else tickBoss2(boss);
					// 猫バスの鳴き声(大掃除#1・会長発案)。画面にいる間、
					// 平均3秒に1回「ニャッ」と鳴く
					if (boss && boss.n === 1 && randInt(1, 90) === 1) play('meow');
				}
			}
		}
	}

	for (let i = bossShots.length - 1; i >= 0; i--) {
		const s = bossShots[i];
		if (s.laser && s.ageTicks !== undefined && s.ageTicks < LASER_GROW_TICKS) s.ageTicks += 1;
		advance(s, TICK);
		if (isOutOfBounds(s)) {
			bossShots.splice(i, 1);
			continue;
		}
		// 2面の追尾弾: 20フレームためてから自機へ向き直り3倍速(classic)
		if (s.homing === 'charging' && s.life !== undefined) {
			if (s.life >= 0) {
				s.life -= 1;
				continue; // ため中は当たらない(classic の return)
			}
			s.angle = aimAtJiki(s.x, s.y);
			s.velocity = s.velocity * 3;
			s.homing = 'done';
			continue;
		}
		touchJiki(s);
	}
}

/** 1面ボスの動き(classic の ping の1面分岐) @param {Boss} b */
function tickBoss1(b) {
	if (stepFlg === STEP_COME && b.x >= 310) {
		// 後進
		b.angle = 90;
		transitions.battle();
	}
	if (stepFlg === STEP_BATTLE) {
		// 上下移動
		if (b.y <= 50) b.angle = 270;
		if (b.y >= 300) b.angle = 90;
	}
}

/** 2面ボス(猫バス)の動き(classic の ping の2面分岐) @param {Boss} b */
function tickBoss2(b) {
	if (stepFlg === STEP_COME) {
		// 左右往復
		if (b.x <= -222) {
			b.imageKey = 'gfx/teki/61/r.gif';
			b.angle = 180;
		}
		if (b.x >= 600) {
			b.imageKey = 'gfx/teki/61/l.gif';
			b.angle = 0;
		}
		// 暴れます(classic)
		if (b.life <= 10) {
			b.turnDir = b.angle === 180 ? 'r' : 'l';
			b.turnMode = 0;
			transitions.battle();
		}
	}
	if (stepFlg === STEP_BATTLE) {
		// 暴れる: 画面の縁を回る
		if (b.turnDir === 'r') {
			// 反時計回り(右端で向き直って時計回りへ)
			if (b.x >= 600) {
				b.imageKey = 'gfx/teki/61/l.gif';
				b.angle = 0;
				b.turnDir = 'l';
			}
		}
		if (b.turnDir === 'l') {
			// 時計回り
			if (b.turnMode === 0 && b.x <= 0) {
				b.angle = 90;
				b.width = 120;
				b.height = 222;
				b.imageKey = 'gfx/teki/61/l_1.gif';
				b.turnMode = 1;
			}
			if (b.turnMode === 1 && b.y <= 0) {
				b.angle = 180;
				b.width = 222;
				b.height = 120;
				b.imageKey = 'gfx/teki/61/l_2.gif';
				b.turnMode = 2;
			}
			if (b.turnMode === 2 && b.x >= 400) {
				b.angle = 270;
				b.width = 120;
				b.height = 222;
				b.x = 480;
				b.imageKey = 'gfx/teki/61/l_3.gif';
				b.turnMode = 3;
			}
			if (b.turnMode === 3 && b.y >= 178) {
				b.angle = 0;
				b.width = 222;
				b.height = 120;
				b.y = 270;
				b.imageKey = 'gfx/teki/61/l.gif';
				b.turnMode = 0;
			}
		}
	}
}

/**
 * 自機へ向く角度(classic の atan2 計算。Diggy の角度規約に合わせ両成分を反転)
 * @param {number} x
 * @param {number} y
 */
function aimAtJiki(x, y) {
	return (Math.atan2((jiki.y - y) * -1, (jiki.x - x) * -1) * 180) / Math.PI;
}

// 2面のボス弾(classic の newSpriteBossSh2 から移植) [0]:直進弾 [1]:追尾弾
/** @param {number} num */
export function makeBossSh2(num) {
	if (!boss || boss.dieTimer > 0) return;
	const velocities = [10, 5];
	bossShots.push({
		x: boss.x + 60,
		y: boss.y + 60,
		width: 16,
		height: 16,
		velocity: velocities[num],
		angle: aimAtJiki(boss.x, boss.y),
		active: true,
		imageKey: `gfx/teki/61/s${num}.gif`,
		n: num,
		life: 20,
		homing: num === 1 ? 'charging' : undefined,
	});
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, import('./engine/assets.js').Anim>} images
 * @param {number} tMs アニメーション時刻(ミリ秒)
 */
export function drawBoss(ctx, images, tMs) {
	for (const s of bossShots) {
		const frame = frameOf(images[s.imageKey], tMs);
		if (s.laser && s.ageTicks !== undefined && s.ageTicks < LASER_GROW_TICKS) {
			// 砲口(右端)からじわっと伸びる演出(大掃除#1・会長発案)。
			// 砲口側を固定し、左の未到達部分だけを描かない
			const ratio = s.ageTicks / LASER_GROW_TICKS;
			const visibleW = Math.max(1, Math.round(frame.width * ratio));
			ctx.drawImage(
				frame,
				frame.width - visibleW,
				0,
				visibleW,
				frame.height,
				Math.round(s.x + s.width - visibleW),
				Math.round(s.y),
				visibleW,
				s.height,
			);
			continue;
		}
		ctx.drawImage(frame, Math.round(s.x), Math.round(s.y));
	}
	if (boss) {
		ctx.drawImage(frameOf(images[boss.imageKey], tMs), Math.round(boss.x), Math.round(boss.y));
	}
	// レーザーの溜め予告: 砲口の明滅と射線の点滅(素材を増やさず canvas 直描き)
	if (boss && boss.n === 0 && boss.laserWarn && boss.dieTimer === 0 && stepFlg === STEP_BATTLE) {
		if (Math.floor(tMs / 90) % 2 === 0) {
			const mx = boss.x + 8; // レーザー(x: boss.x-120, 幅128)の右端=砲口
			const my = boss.y + 49;
			const rad = ((270 - 10) * Math.PI) / 180; // レーザーと同じ進行方向
			ctx.strokeStyle = 'rgba(255, 96, 96, 0.4)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(mx, my);
			ctx.lineTo(mx + Math.sin(rad) * 700, my + Math.cos(rad) * 700);
			ctx.stroke();
			ctx.fillStyle = 'rgba(255, 160, 120, 0.9)';
			ctx.beginPath();
			ctx.arc(mx, my, 5, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}
