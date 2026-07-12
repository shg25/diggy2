// 自機とショット。classic の sprite.js / set.js / stage.js(moveJiki) から移植。
// プールの選び方・発射位置・レーザーの3方向展開は classic のアルゴリズムのまま。
// 変わったのは「DGEスプライト → ただのオブジェクト」と「フレーム基準 → 時間基準」。
import { state } from './state.js';
import { FPS, BAN_DURATION_MS } from './const.js';
import { JIKI_SH_DEFS } from './defs.js';
import { advance, isOutOfBounds, drawEntity } from './entity.js';
import { WIDTH, HEIGHT } from './engine/screen.js';
import { isDown } from './engine/input.js';

export const JIKI_IMAGE = 'gfx/jiki/n.gif';
const BAN_IMAGE = 'gfx/ban.gif';

export const jiki = { x: WIDTH / 2 - 16, y: HEIGHT / 2 - 16, width: 32, height: 32 };

/** @type {'alive' | 'ban' | 'gone'} 被弾すると ban(やられ演出) → gone */
let jikiState = 'alive';
let banTimer = 0;

/** 被弾(classic の removeJiki 相当: ban.gif を出してから消える) */
export function killJiki() {
	jikiState = 'ban';
	banTimer = BAN_DURATION_MS / 1000;
}

const NUM_SHOTS = 3; // classic の numJikiSh1/2/3 と同じ

/**
 * @param {{ image: string, width: number, height: number, velocity: number, angle: number }} def
 * @returns {import('./entity.js').Entity[]}
 */
function makePool(def) {
	return Array.from({ length: NUM_SHOTS }, () => ({
		x: 0,
		y: 0,
		width: def.width,
		height: def.height,
		velocity: def.velocity,
		angle: def.angle,
		active: false,
		imageKey: def.image,
	}));
}

export const jikiSh1 = makePool(JIKI_SH_DEFS[0]);
export const jikiSh2 = makePool(JIKI_SH_DEFS[1]);
export const jikiSh3 = makePool(JIKI_SH_DEFS[2]);

/** 自機を初期位置に戻す */
export function resetJiki() {
	jikiState = 'alive';
	banTimer = 0;
	jiki.x = WIDTH / 2 - 16;
	jiki.y = HEIGHT / 2 - 16;
	for (const pool of [jikiSh1, jikiSh2, jikiSh3]) {
		for (const shot of pool) shot.active = false;
	}
}

// --------------------------------------------------
// パワーアップ効果(classic の sprite.js から移植・state のみ触る)

// ショット変更
export function chJikiSh() {
	if (state.jikiShFlg !== 3) state.jikiShFlg += 1;
	else state.jikiShFlg = 0;
}

// スピード変更
export function chVelJiki() {
	if (state.velJiki === 5) state.velJiki = 10;
	else if (state.velJiki === 10) state.velJiki = 30;
	else if (state.velJiki === 30) state.velJiki = 1;
	else if (state.velJiki === 1) state.velJiki = 5;
}

// --------------------------------------------------
// ショット撃つ(classic の set.js から移植)

export function makeJikiSh() {
	if (state.jikiShFlg === 3) {
		shotJikiSh(3); // 3方向
		return;
	}
	shotJikiSh(1); // 前
	if (state.jikiShFlg === 2) shotJikiSh(2); // 後
}

/** @param {number} type ショット種別(1:前 2:後 3:レーザー) */
function shotJikiSh(type) {
	for (let i = 0; i < NUM_SHOTS; i++) {
		if (type === 1) {
			if (!jikiSh1[i].active) {
				startJikiSh(jikiSh1[i], 1);
				break;
			}
		} else if (type === 2) {
			if (!jikiSh2[i].active) {
				startJikiSh(jikiSh2[i], 2);
				break;
			}
		} else if (type === 3) {
			if (!jikiSh3[i].active && !jikiSh3[i + 1].active && !jikiSh3[i + 2].active) {
				for (let n = 0; n < NUM_SHOTS; n++) {
					jikiSh3[i + n].angle = 150 + 30 * n;
					startJikiSh(jikiSh3[i + n], 3);
				}
			}
			break;
		}
	}
}

/**
 * @param {import('./entity.js').Entity} shot
 * @param {number} type ショット種別(発射位置が変わる)
 */
function startJikiSh(shot, type) {
	if (type === 1 || type === 3) {
		shot.x = jiki.x + jiki.width;
		shot.y = jiki.y + 12;
	} else if (type === 2) {
		shot.x = jiki.x;
		shot.y = jiki.y + 12;
	}
	shot.active = true;
}

// --------------------------------------------------

/**
 * 自機の移動(classic の stage.js moveJiki から移植)。操作可能なときだけ呼ぶ。
 * @param {number} dt 経過秒
 */
export function moveJikiByInput(dt) {
	const step = state.velJiki * FPS * dt; // classic: velJiki px/フレーム(30fps)
	if (isDown('up')) {
		jiki.y -= step;
		if (jiki.y <= 0) jiki.y = 0;
	}
	if (isDown('down')) {
		jiki.y += step;
		if (jiki.y >= HEIGHT - jiki.height) jiki.y = HEIGHT - jiki.height;
	}
	if (isDown('left')) {
		jiki.x -= step;
		if (jiki.x <= 0) jiki.x = 0;
	}
	if (isDown('right')) {
		jiki.x += step;
		if (jiki.x >= WIDTH - jiki.width) jiki.x = WIDTH - jiki.width;
	}
}

/**
 * ショットの前進とやられ演出の進行。どの場面でも毎フレーム呼ぶ。
 * @param {number} dt 経過秒
 */
export function updateShots(dt) {
	if (jikiState === 'ban') {
		banTimer -= dt;
		if (banTimer <= 0) jikiState = 'gone';
	}
	for (const pool of [jikiSh1, jikiSh2, jikiSh3]) {
		for (const shot of pool) {
			if (!shot.active) continue;
			advance(shot, dt);
			if (isOutOfBounds(shot)) shot.active = false;
		}
	}
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, HTMLImageElement>} images
 */
export function drawPlayer(ctx, images) {
	for (const pool of [jikiSh1, jikiSh2, jikiSh3]) {
		for (const shot of pool) drawEntity(ctx, images, shot);
	}
	if (jikiState === 'alive') {
		ctx.drawImage(images[JIKI_IMAGE], Math.round(jiki.x), Math.round(jiki.y));
	} else if (jikiState === 'ban') {
		ctx.drawImage(images[BAN_IMAGE], Math.round(jiki.x), Math.round(jiki.y));
	}
}

/** 検証用: いま画面にあるショット数 */
export function countActiveShots() {
	let n = 0;
	for (const pool of [jikiSh1, jikiSh2, jikiSh3]) {
		for (const shot of pool) if (shot.active) n++;
	}
	return n;
}
