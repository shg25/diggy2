// JIB-FREAK MOBILE エントリポイント。
// タイトル → READY → START(自機を操作して撃てる)まで移植済み。
// 敵・アイテム・ボスはこれから。
// flow.js / state.js / const.js は classic から1文字も変えずに使っている。
import { createScreen, WIDTH, HEIGHT } from './engine/screen.js';
import { startLoop } from './engine/loop.js';
import { initInput, wasPressed, flushInput } from './engine/input.js';
import { loadImages } from './engine/assets.js';
import { STEP_TITLE, STEP_READY, STEP_START, setStep } from './flow.js';
import * as flow from './flow.js';
import { state } from './state.js';
import { JIKI_SH_DEFS } from './defs.js';
import {
	jiki,
	JIKI_IMAGE,
	resetJiki,
	updatePlayer,
	drawPlayer,
	makeJikiSh,
	chJikiSh,
	chVelJiki,
	countActiveShots,
} from './player.js';

const parent = document.getElementById('screen');
if (!parent) throw new Error('#screen がない');
const ctx = createScreen(parent);
initInput();

const images = await loadImages({
	'gfx/bg.gif': 'gfx/bg.gif',
	[JIKI_IMAGE]: JIKI_IMAGE,
	[JIKI_SH_DEFS[0].image]: JIKI_SH_DEFS[0].image,
	[JIKI_SH_DEFS[2].image]: JIKI_SH_DEFS[2].image,
});

// 背景の絵柄は960pxで一周する(classicと同じ素材・同じ周期)
const BG_PERIOD = 960;
const BG_SPEED = 60; // px/秒 (classicの velocity 2 × 30fps 相当)

let bgX = 0;
let time = 0;
let stepTimer = 0;
let goTimer = 0;

/**
 * 中央揃えテキスト
 * @param {string} str
 * @param {number} y
 * @param {number} size
 * @param {string} color
 */
function text(str, y, size, color) {
	ctx.fillStyle = color;
	ctx.font = `${size}px Verdana, sans-serif`;
	ctx.textAlign = 'center';
	ctx.fillText(str, WIDTH / 2, y);
}

setStep(STEP_TITLE);

startLoop({
	/** @param {number} dt */
	update(dt) {
		time += dt;
		bgX = (bgX + BG_SPEED * dt) % BG_PERIOD;

		if (flow.stepFlg === STEP_TITLE) {
			if (wasPressed('action')) {
				// classic の goReady 相当: 2秒の READY? を挟んで開始
				resetJiki();
				setStep(STEP_READY);
				stepTimer = 2;
			}
		} else if (flow.stepFlg === STEP_READY) {
			stepTimer -= dt;
			if (stepTimer <= 0) {
				setStep(STEP_START);
				goTimer = 1; // GO!! を1秒表示(classic の goStart 相当)
			}
		} else if (flow.stepFlg === STEP_START) {
			goTimer -= dt;
			if (wasPressed('action')) makeJikiSh();
			if (wasPressed('shot')) chJikiSh(); // 隠しコマンド(classic の Z)
			if (wasPressed('speed')) chVelJiki(); // 隠しコマンド(classic の S)
			updatePlayer(dt);
		}
		flushInput();
	},
	draw() {
		// 夜空
		const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
		sky.addColorStop(0, '#000');
		sky.addColorStop(0.7, '#0a1a4a');
		sky.addColorStop(1, '#1a0e00');
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, WIDTH, HEIGHT);

		// スクロールする地面(classicと同じ素材)
		ctx.drawImage(images['gfx/bg.gif'], -bgX, HEIGHT - 320);

		if (flow.stepFlg === STEP_TITLE) {
			text('JIB-FREAK', 150, 48, '#3c9');
			text('MOBILE', 195, 30, '#3c9');
			const bob = Math.sin(time * 2) * 8;
			ctx.drawImage(images[JIKI_IMAGE], WIDTH / 2 - 16, 240 + bob);
			if (Math.floor(time * 2) % 2 === 0) {
				text('PRESS SPACE / TAP TO START', 320, 13, '#fff');
			}
			text('CLASSIC: RIDGE部 → ../classic/', 385, 10, '#667');
		} else if (flow.stepFlg === STEP_READY) {
			drawPlayer(ctx, images);
			text('READY?', 200, 20, '#fff');
		} else if (flow.stepFlg === STEP_START) {
			drawPlayer(ctx, images);
			if (goTimer > 0) text('GO!!', 200, 20, '#fff');
			text('敵の移植はこれから(移動: 矢印 / 射撃: スペース or タップ)', 385, 10, '#667');
		}
	},
});

// 検証・デバッグ用の窓口(classicの window.ridge と同じ思想)
window.jibfreak = {
	debug: {
		get stepFlg() {
			return flow.stepFlg;
		},
		state,
		jiki,
		get activeShots() {
			return countActiveShots();
		},
	},
};
