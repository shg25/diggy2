// JIB-FREAK MOBILE エントリポイント。
// いまはタイトル画面だけの「器」。ゲーム本体は classic から順次移植する。
// flow.js(状態機械)は classic のものを1文字も変えずに使っている——
// レイヤー分け(レッスン14)の移植性の証明。
import { createScreen, WIDTH, HEIGHT } from './engine/screen.js';
import { startLoop } from './engine/loop.js';
import { initInput, wasPressed, flushInput } from './engine/input.js';
import { loadImages } from './engine/assets.js';
import { STEP_TITLE, STEP_READY, setStep } from './flow.js';
import * as flow from './flow.js';

const parent = document.getElementById('screen');
if (!parent) throw new Error('#screen がない');
const ctx = createScreen(parent);
initInput();

const images = await loadImages({
	bg: 'gfx/bg.gif',
	jiki: 'gfx/jiki/n.gif',
});

// 背景の絵柄は960pxで一周する(classicと同じ素材・同じ周期)
const BG_PERIOD = 960;
const BG_SPEED = 60; // px/秒 (classicの velocity 2 × 30fps 相当)

let bgX = 0;
let time = 0;
let readyTimer = 0;

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

		if (flow.stepFlg === STEP_TITLE && wasPressed('action')) {
			setStep(STEP_READY);
			readyTimer = 2;
		}
		if (flow.stepFlg === STEP_READY) {
			readyTimer -= dt;
			if (readyTimer <= 0) setStep(STEP_TITLE);
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
		ctx.drawImage(images.bg, -bgX, HEIGHT - 320);

		// タイトルロゴ(新しい名前はcanvasのテキストで描く)
		text('JIB-FREAK', 150, 48, '#3c9');
		text('MOBILE', 195, 30, '#3c9');

		// 自機が上下にふわふわ浮いている
		const bob = Math.sin(time * 2) * 8;
		ctx.drawImage(images.jiki, WIDTH / 2 - 16, 240 + bob);

		if (flow.stepFlg === STEP_TITLE) {
			// 点滅するスタート案内
			if (Math.floor(time * 2) % 2 === 0) {
				text('PRESS SPACE / TAP TO START', 320, 13, '#fff');
			}
		} else if (flow.stepFlg === STEP_READY) {
			text('UNDER CONSTRUCTION', 320, 16, '#fc6');
			text('ゲーム本体は移植中です', 345, 12, '#fc6');
		}

		text('CLASSIC: RIDGE部 → ../classic/', 385, 10, '#667');
	},
});

// 検証・デバッグ用の窓口(classicの window.ridge と同じ思想)
window.jibfreak = {
	debug: {
		get stepFlg() {
			return flow.stepFlg;
		},
	},
};
