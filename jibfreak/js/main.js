// JIB-FREAK MOBILE エントリポイント。
// 場面遷移(タイトル/デモ/READY/戦闘/勝敗/ポーズ)・入力の振り分け・
// 描画の束ねを担う。ゲームの中身は player/enemies/boss/items/stage が持つ。
// flow.js は classic のコピーに win フックと STEP_PAUSE を足したもの
// (詳細は docs/lessons と docs/seitokai の各議事録)。
import { createScreen, WIDTH, HEIGHT } from './engine/screen.js';
import { startLoop } from './engine/loop.js';
import {
	initInput,
	wasPressed,
	isDown,
	isPointerDown,
	consumeTaps,
	suppressCurrentPointer,
	setVirtualActions,
	wasAnyRealInput,
	flushInput,
} from './engine/input.js';
import { autopilotActions, resetAutopilot } from './autopilot.js';
import { loadImages, frameOf } from './engine/assets.js';
import { loadStage2Unlocked, saveStage2Unlocked } from './storage.js';
import { play, toggleMute, isMuted, soundRequests } from './engine/sound.js';
import {
	STEP_TITLE,
	STEP_READY,
	STEP_START,
	STEP_COME,
	STEP_BATTLE,
	STEP_WIN,
	STEP_LOSE,
	STEP_PAUSE,
	setStep,
	transitions,
} from './flow.js';
import * as flow from './flow.js';
import { state } from './state.js';
import { JIKI_SH_DEFS, TEKI1_DEFS, PWR_DEFS, BAN_IMAGE } from './defs.js';
import {
	jiki,
	jikiHitbox,
	JIKI_IMAGE,
	resetJiki,
	killJiki,
	moveJikiByInput,
	updateShots,
	drawPlayer,
	makeJikiSh,
	chJikiSh,
	chVelJiki,
	countActiveShots,
	activeShotXs,
} from './player.js';
import { tekis, teki2, tekiHurtbox, resetTekis, drawTekis, rmGroupTeki } from './enemies.js';
import { pwrs, resetPwrs, drawPwrs } from './items.js';
import {
	boss,
	bossShots,
	bossBodyBox,
	spawnBoss,
	getoutBoss,
	resetBoss,
	drawBoss,
	BOSS_IMAGE,
	BOSS_SH_IMAGE,
	BOSS_LASER_IMAGE,
	BOSS2_IMAGES,
} from './boss.js';
import { updateStage, resetStage } from './stage.js';
import { resetScore, getScore, getHiScore, isNewRecord, drawHud } from './hud.js';

/**
 * スマホでURLバーを隠す(会長指摘)。PC(マウス操作)では求めていない
 * ので、粗いポインタ(タッチ)の端末に限る。iOS Safari は未対応で
 * 静かに失敗する(catchで無視)。
 *
 * 実機検証で判明した罠: Fullscreen API は「ユーザー操作イベントの
 * 直後」でないと拒否される。HTMLの仕様上「操作とみなされるイベント」
 * は click/pointerup/keydown 等で、**pointerdown は含まれない**。
 * ゲーム側のタップ処理は pointerdown を配列に貯めて次の
 * requestAnimationFrame でまとめて捌く作りのため、この経路を通すと
 * ブラウザから見て「操作の直後」ではなくなり、HTTPSにしても直らない
 * 静かな失敗になっていた。そのため、ゲームの入力処理を経由せず、
 * click イベントに直接反応してその場で呼ぶ(一度だけ)
 */
function armFullscreenOnFirstTap() {
	if (!window.matchMedia('(pointer: coarse)').matches) return;
	window.addEventListener(
		'click',
		() => {
			document.documentElement
				.requestFullscreen?.()
				.catch((e) => console.warn('fullscreen失敗:', e));
		},
		{ once: true },
	);
}

const parent = document.getElementById('screen');
if (!parent) throw new Error('#screen がない');
const ctx = createScreen(parent);
// ドット絵のゲームなので拡大は常に補間なし(ロゴのピクセル拡大にも必要)
ctx.imageSmoothingEnabled = false;
initInput();
armFullscreenOnFirstTap();

// タイトルロゴ(大掃除#1): 小さく描いた文字を補間なしで拡大して
// ドット文字にする(フォント追加なしのレトロ演出・会長答弁の案a)。
// 色はジブリの系譜を意識した暖色(会長答弁: 赤〜ピンク系)
const LOGO_COLOR = '#f66';
/**
 * @param {string} str
 * @param {number} px 原寸のフォントサイズ(これを整数倍に拡大する)
 */
function makePixelText(str, px) {
	const c = document.createElement('canvas');
	const pctx = c.getContext('2d');
	if (!pctx) throw new Error('canvas 2d context を取得できない');
	pctx.font = `bold ${px}px Verdana, sans-serif`;
	c.width = Math.ceil(pctx.measureText(str).width) + 2;
	c.height = Math.ceil(px * 1.3);
	pctx.font = `bold ${px}px Verdana, sans-serif`; // サイズ変更で失われるため再設定
	pctx.textBaseline = 'top';
	pctx.fillStyle = LOGO_COLOR;
	pctx.fillText(str, 1, 1);
	// にじみ対策(会長指摘): fillText のアンチエイリアスは切れないので、
	// 輪郭の半透明画素が拡大で大きな半透明ブロックになっていた。
	// α値にしきい値をかけてドットを「有るか無いか」に二値化する
	const img = pctx.getImageData(0, 0, c.width, c.height);
	const d = img.data;
	for (let i = 3; i < d.length; i += 4) {
		d[i] = d[i] >= 140 ? 255 : 0;
	}
	pctx.putImageData(img, 0, 0);
	return c;
}
// 元絵の解像度を上げ、最終拡大率を下げる(会長指摘: スマホで歪む)。
// canvas の内部解像度(600x400)は画面フィットでさらに非整数倍に
// 拡大されるため、元絵が粗いほど二重拡大のガタつきが目立つ。
// 最終的な見た目のサイズ(px*倍率)は変えず、元絵をより精密にする
const LOGO_MAIN_SCALE = 2; // 旧: px12×4倍 → px24×2倍(見た目同じ48px相当)
const LOGO_SUB_SCALE = 1.5; // 旧: px10×3倍 → px20×1.5倍(見た目同じ30px相当)
const logoMain = makePixelText('JIB-FREAK', 24);
const logoSub = makePixelText('MOBILE', 20);

/** @type {Record<string, string>} */
const sources = {
	'gfx/bg.gif': 'gfx/bg.gif',
	'gfx/title/arrow.gif': 'gfx/title/arrow.gif', // 20年前の未使用素材、初出番
	[JIKI_IMAGE]: JIKI_IMAGE,
	[BAN_IMAGE]: BAN_IMAGE,
	[JIKI_SH_DEFS[0].image]: JIKI_SH_DEFS[0].image,
	[JIKI_SH_DEFS[2].image]: JIKI_SH_DEFS[2].image,
};
TEKI1_DEFS.forEach((_, n) => {
	sources[`gfx/teki/${n}/l.gif`] = `gfx/teki/${n}/l.gif`;
	sources[`gfx/teki/${n}/r.gif`] = `gfx/teki/${n}/r.gif`;
});
PWR_DEFS.forEach((_, n) => {
	sources[`gfx/teki/${n + 80}/l.gif`] = `gfx/teki/${n + 80}/l.gif`;
});
for (const key of [BOSS_IMAGE, BOSS_SH_IMAGE, BOSS_LASER_IMAGE, ...BOSS2_IMAGES]) {
	sources[key] = key;
}
sources['gfx/teki/20/l.gif'] = 'gfx/teki/20/l.gif'; // とぅと郎
sources['gfx/teki/20/r.gif'] = 'gfx/teki/20/r.gif';
// 読み込み中の案内(大掃除#1・外部顧問の指摘: 失敗時に永久の黒画面だった)
ctx.fillStyle = '#889';
ctx.font = '14px Verdana, sans-serif';
ctx.textAlign = 'center';
ctx.fillText('NOW LOADING...', WIDTH / 2, HEIGHT / 2);
let images;
try {
	images = await loadImages(sources);
} catch (e) {
	ctx.fillStyle = '#f66';
	ctx.fillText('LOADING FAILED - PLEASE RELOAD', WIDTH / 2, HEIGHT / 2 + 24);
	throw e;
}

// 背景の絵柄は960pxで一周する(classicと同じ素材・同じ周期)
const BG_PERIOD = 960;
const BG_SPEED = 60; // px/秒 (classicの velocity 2 × 30fps 相当)

let bgX = 0;
let time = 0;
let animTime = 0; // GIFアニメの時計。ゲーム内時間なのでポーズで止まる
let stepTimer = 0;
let goTimer = 0;
let loseTimer = 0;
let winTimer = 0;
let pausedFrom = STEP_START; // ポーズ解除で戻る先
let fireCooldown = 0;
// ホールド連射の間隔(第5回・会長発議)。新規の押下は待たずに即発射
// するので、最速の連射は物理的な連打で出る
const AUTOFIRE_INTERVAL = 0.15;

// アトラクトモード(第7回)。タイトル放置でCPUのデモプレイが始まる
const DEMO_IDLE_SEC = 15; // 放置がこの秒数でデモ開始
const DEMO_MAX_SEC = 45; // デモの上限(死ななくてもタイトルへ戻す)
let idleTimer = 0;
let demoTimer = 0;

// 画面上ボタンとタイトルメニューの当たり枠(論理座標)
const PAUSE_BTN = { x: 534, y: 26, w: 26, h: 20 };
const SOUND_BTN = { x: 566, y: 26, w: 26, h: 20 };
const MENU_ROWS = [
	{ x: 240, y: 258, w: 120, h: 22 },
	{ x: 240, y: 282, w: 120, h: 22 },
];

/**
 * @param {{ x: number, y: number }} p
 * @param {{ x: number, y: number, w: number, h: number }} r
 */
function inRect(p, r) {
	return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

// ポーズの出入り(Pキーと⏸ボタンの共通処理)
function togglePause() {
	if (flow.stepFlg === STEP_PAUSE) {
		setStep(pausedFrom);
	} else if (
		flow.stepFlg === STEP_START ||
		flow.stepFlg === STEP_COME ||
		flow.stepFlg === STEP_BATTLE ||
		flow.stepFlg === STEP_WIN
	) {
		pausedFrom = flow.stepFlg;
		setStep(STEP_PAUSE);
	}
}

// タイトルのステージ選択(第3回生徒会)
let selectedStage = 1;
let stage2Unlocked = loadStage2Unlocked();
let unlockedNow = false; // このゲームの勝利で解放した瞬間か

// ボス登場(classic の goCome) / ボス戦開始(goBattle) / 勝利(goWin)。
// goWin は classic では未配線だった演出を、当時の作り込みどおりに再現
transitions.come = () => {
	setStep(STEP_COME);
	spawnBoss();
	play('bossCome');
};
transitions.battle = () => {
	setStep(STEP_BATTLE);
};
transitions.win = () => {
	setStep(STEP_WIN);
	winTimer = 5; // classic goWin: YOU WIN を5秒
	play('win');
	// ステージ1を初めてクリアしたらステージ2が解放される(苦労の報酬)。
	// CPUが倒しても解放しない(デモの成果は何も残さない)
	if (state.stageFlg === 1 && !stage2Unlocked && !state.demo) {
		stage2Unlocked = true;
		unlockedNow = true;
		saveStage2Unlocked();
		play('unlock', 0.5); // 勝利ジングルの直後に
	}
	if (isNewRecord()) play('record', 1.0);
};

// 被弾 → GAME OVER(classic の goLose 相当)。
// 敵の当たり判定は transitions.lose() を呼ぶだけで、
// その先で何が起きるかを知らない(classic と同じ依存性逆転)
transitions.lose = () => {
	if (flow.stepFlg === STEP_LOSE) return;
	setStep(STEP_LOSE);
	killJiki();
	getoutBoss(); // ボスは飛び去る(classic)
	play('hit');
	if (isNewRecord()) play('record', 0.6);
	loseTimer = 3;
};

// classic の resetSprite + goReturn 相当
function returnToTitle() {
	state.demo = false; // デモはタイトルに戻れば必ず終わる
	setVirtualActions([]);
	idleTimer = 0;
	state.velJiki = 5;
	state.jikiShFlg = 1;
	resetTekis();
	resetPwrs();
	resetBoss();
	resetStage();
	setStep(STEP_TITLE);
}

// classic の goReady 相当: スコアを戻し、2秒の READY? を挟んで開始
/** @param {number} stage */
function startPlay(stage) {
	state.stageFlg = stage;
	unlockedNow = false;
	resetScore();
	resetJiki();
	resetTekis();
	resetPwrs();
	resetBoss();
	resetStage();
	setStep(STEP_READY);
	stepTimer = 2;
}

// 1面クリア後の継続(大掃除#1・元の設計の実現)。
// スコアと装備(ショット強化・スピード)を持ち越して2面へ——
// ハイスコア狙いは1面から通しで、が基本線(会長答弁)
function continueToStage2() {
	state.stageFlg = 2;
	unlockedNow = false;
	resetJiki();
	resetTekis();
	resetPwrs();
	resetBoss();
	resetStage();
	setStep(STEP_READY);
	stepTimer = 2;
}

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

// 画面上ボタン(⏸と♪)。常時表示(会長答弁: 画面判定は極力減らす)。
// 大掃除#1: 薄い塗りを足して「押せる」感を出す(立体感は違和感・会長答弁)。
// ポーズ記号は文字「II」だとローマ数字に見えるため、2本のバーを図形で描く
function drawButtons() {
	/** @type {[{ x: number, y: number, w: number, h: number }, 'pause' | 'sound', boolean][]} */
	const buttons = [
		[PAUSE_BTN, 'pause', true],
		[SOUND_BTN, 'sound', !isMuted()],
	];
	for (const [btn, kind, on] of buttons) {
		ctx.fillStyle = on ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
		ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
		ctx.strokeStyle = on ? '#889' : '#454c5c';
		ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
		ctx.fillStyle = on ? '#ccd' : '#454c5c';
		if (kind === 'pause') {
			ctx.fillRect(btn.x + 9, btn.y + 5, 3, 10);
			ctx.fillRect(btn.x + 15, btn.y + 5, 3, 10);
		} else {
			ctx.font = '12px Verdana, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('♪', btn.x + btn.w / 2, btn.y + 15);
		}
	}
}

setStep(STEP_TITLE);

startLoop({
	/** @param {number} dt */
	update(dt) {
		time += dt;
		// 背景のスクロールとGIFアニメはゲーム内時間。ポーズ中は止める
		if (flow.stepFlg !== STEP_PAUSE) {
			bgX = (bgX + BG_SPEED * dt) % BG_PERIOD;
			animTime += dt;
		}

		// アトラクトモード中(第7回): 何か操作されるか時間切れでタイトルへ。
		// 続いていれば自動操縦に操作を握らせる(実入力の処理より先に立つ)
		if (state.demo) {
			demoTimer += dt;
			if (wasAnyRealInput() || demoTimer >= DEMO_MAX_SEC) {
				returnToTitle();
				flushInput();
				return;
			}
			setVirtualActions(autopilotActions(dt));
		}

		// ミュート切替はどの場面でも効く(音を出す変更はユーザー操作の中で行う)
		if (wasPressed('mute')) toggleMute();

		// タップの振り分け: 画面上ボタン → タイトルメニュー → その他(開始/射撃)
		let tapAction = false;
		for (const tap of consumeTaps()) {
			if (inRect(tap, SOUND_BTN)) {
				toggleMute();
				suppressCurrentPointer();
			} else if (inRect(tap, PAUSE_BTN)) {
				suppressCurrentPointer();
				togglePause();
			} else if (flow.stepFlg === STEP_TITLE && inRect(tap, MENU_ROWS[0])) {
				selectedStage = 1;
			} else if (flow.stepFlg === STEP_TITLE && inRect(tap, MENU_ROWS[1])) {
				if (stage2Unlocked) selectedStage = 2;
			} else {
				tapAction = true;
			}
		}

		if (flow.stepFlg === STEP_TITLE) {
			// アトラクト(第7回): 放置15秒でCPUのデモプレイが始まる
			idleTimer += dt;
			if (wasAnyRealInput()) idleTimer = 0;
			if (idleTimer >= DEMO_IDLE_SEC) {
				state.demo = true;
				demoTimer = 0;
				idleTimer = 0;
				resetAutopilot();
				startPlay(1); // デモはステージ1固定(会長答弁)
			}
			// ステージ選択(解放済みのときだけカーソルが動く)
			if (stage2Unlocked && (wasPressed('up') || wasPressed('down'))) {
				selectedStage = selectedStage === 1 ? 2 : 1;
			}
			if (wasPressed('action') || tapAction) startPlay(selectedStage);
		} else if (flow.stepFlg === STEP_READY) {
			stepTimer -= dt;
			if (stepTimer <= 0) {
				setStep(STEP_START);
				goTimer = 1; // GO!! を1秒表示(classic の goStart 相当)
			}
		} else if (
			flow.stepFlg === STEP_START ||
			flow.stepFlg === STEP_COME ||
			flow.stepFlg === STEP_BATTLE ||
			flow.stepFlg === STEP_WIN
		) {
			if (wasPressed('pause')) {
				// ポーズ突入。時間ごと止める(タイマー類はこの分岐でしか進まない)
				togglePause();
				flushInput();
				return;
			}
			goTimer -= dt;
			// 連射: 新規の押下(キー/タップ)は即発射、ホールドは一定間隔。
			// 画面内の弾数はプールの3発制限が守る
			fireCooldown -= dt;
			if (wasPressed('action') || tapAction) {
				makeJikiSh();
				fireCooldown = AUTOFIRE_INTERVAL;
			} else if ((isDown('action') || isPointerDown()) && fireCooldown <= 0) {
				makeJikiSh();
				fireCooldown = AUTOFIRE_INTERVAL;
			}
			if (wasPressed('shot')) chJikiSh(); // 隠しコマンド(classic の Z)
			if (wasPressed('speed')) chVelJiki(); // 隠しコマンド(classic の S)
			if (wasPressed('bomb')) rmGroupTeki(); // 隠しコマンド(classic の B)
			moveJikiByInput(dt);
			updateShots(dt);
			// classic はGO!!の1秒後に startStage していたので、開始直後は進行を待つ
			if (flow.stepFlg !== STEP_START || goTimer <= 0) updateStage(dt);
			if (flow.stepFlg === STEP_WIN) {
				winTimer -= dt;
				if (winTimer <= 0) {
					// 1面クリアは2面へ継続。2面クリアとデモはタイトルへ
					// (デモは何も残さない・第7回の精神)
					if (state.stageFlg === 1 && !state.demo) continueToStage2();
					else returnToTitle();
				}
			}
		} else if (flow.stepFlg === STEP_PAUSE) {
			// 停止中は何も進めない。P か ⏸ で即時再開(隠しコマンド含め他は無効)
			if (wasPressed('pause')) togglePause();
		} else if (flow.stepFlg === STEP_LOSE) {
			// 操作は効かないが、飛んでいる弾と敵は流れ続ける(classicと同じ)
			updateShots(dt);
			updateStage(dt);
			loseTimer -= dt;
			if (loseTimer <= 0) returnToTitle();
		}
		flushInput();
	},
	draw() {
		const tMs = animTime * 1000;
		// 夜空
		const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
		sky.addColorStop(0, '#000');
		sky.addColorStop(0.7, '#0a1a4a');
		sky.addColorStop(1, '#1a0e00');
		ctx.fillStyle = sky;
		ctx.fillRect(0, 0, WIDTH, HEIGHT);

		// スクロールする地面。素材は960px幅しかなく、classic では DOM の
		// background-repeat が自動でタイルを敷いていた。canvas は1枚しか
		// 描かないので、2枚並べて途切れなく繋ぐ
		ctx.drawImage(frameOf(images['gfx/bg.gif'], tMs), -bgX, HEIGHT - 320);
		ctx.drawImage(frameOf(images['gfx/bg.gif'], tMs), -bgX + BG_PERIOD, HEIGHT - 320);

		if (flow.stepFlg === STEP_TITLE) {
			// ドット文字のロゴ(補間なし拡大)
			ctx.drawImage(
				logoMain,
				Math.round(WIDTH / 2 - (logoMain.width * LOGO_MAIN_SCALE) / 2),
				100,
				logoMain.width * LOGO_MAIN_SCALE,
				logoMain.height * LOGO_MAIN_SCALE,
			);
			ctx.drawImage(
				logoSub,
				Math.round(WIDTH / 2 - (logoSub.width * LOGO_SUB_SCALE) / 2),
				168,
				logoSub.width * LOGO_SUB_SCALE,
				logoSub.height * LOGO_SUB_SCALE,
			);
			const bob = Math.sin(time * 2) * 8;
			ctx.drawImage(frameOf(images[JIKI_IMAGE], tMs), WIDTH / 2 - 16, 212 + bob);

			// ステージ選択メニュー(カーソルは20年前の未使用素材 arrow.gif)
			const menuY = [272, 296];
			text('STAGE 1', menuY[0], 14, selectedStage === 1 ? '#fff' : '#889');
			if (stage2Unlocked) {
				text('STAGE 2', menuY[1], 14, selectedStage === 2 ? '#fff' : '#889');
			} else {
				text('STAGE 2', menuY[1], 14, '#454c5c');
				text('CLEAR STAGE 1 TO UNLOCK', menuY[1] + 14, 10, '#889');
			}
			// カーソル自体も2コマのアニメGIF(20年前の芸の細かさ)
			ctx.drawImage(
				frameOf(images['gfx/title/arrow.gif'], tMs),
				WIDTH / 2 - 52,
				menuY[selectedStage - 1] - 11,
				8,
				14,
			);

			if (Math.floor(time * 2) % 2 === 0) {
				text('PRESS SPACE OR TAP', 336, 14, '#fff');
			}
			text('ARROWS: SELECT & MOVE / SPACE: SHOOT / P: PAUSE / M: SOUND', 362, 10, '#889');
			text('CLASSIC: RIDGE-BU → ../classic/', 385, 10, '#889');
			drawHud(ctx);
			drawButtons();
		} else {
			drawPwrs(ctx, images, tMs);
			drawTekis(ctx, images, tMs);
			drawBoss(ctx, images, tMs);
			drawPlayer(ctx, images, tMs);
			if (state.showHitboxes) drawHitboxes(ctx);
			drawHud(ctx);
			drawButtons();
			text('ARROWS: MOVE / SPACE: SHOOT / P: PAUSE / M: SOUND', 385, 10, '#889');
			if (state.demo && Math.floor(time * 2) % 2 === 0) {
				// 大掃除#1(会長答弁): DEMO PLAY は廃止して PRESS ANY KEY のみ。
				// 位置・サイズはタイトルの開始案内と同じ、点滅も同じ
				text('PRESS ANY KEY', 336, 14, '#fff');
			}
			if (flow.stepFlg === STEP_PAUSE) {
				// 薄暗くして PAUSE(会長答弁: 演出は暗転、再開は即時)
				ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
				ctx.fillRect(0, 0, WIDTH, HEIGHT);
				text('PAUSE', 200, 20, '#fff');
				text('PRESS P OR ⏸ TO RESUME', 225, 14, '#889');
			} else if (flow.stepFlg === STEP_READY) {
				text('READY?', 200, 20, '#fff');
			} else if (flow.stepFlg === STEP_START && goTimer > 0) {
				text('GO!!', 200, 20, '#fff');
			} else if (flow.stepFlg === STEP_WIN) {
				text('YOU WIN', 200, 20, '#fff');
				if (isNewRecord()) text('NEW RECORD!', 230, 14, '#fc6');
				if (unlockedNow) text('STAGE 2 UNLOCKED!', 254, 14, '#fc6');
			} else if (flow.stepFlg === STEP_LOSE) {
				text('GAME OVER', 200, 20, '#fff');
				if (isNewRecord()) text('NEW RECORD!', 230, 14, '#fc6');
			}
		}
	},
});

/**
 * 当たり判定の可視化(デバッグ専用: state.showHitboxes で有効化)。
 * 赤=自機の弱点、黄=敵の被弾判定、橙=ボスの体当たり・ボス弾
 * @param {CanvasRenderingContext2D} ctx
 */
function drawHitboxes(ctx) {
	ctx.lineWidth = 1;
	/** @param {{ x: number, y: number, width: number, height: number }} r @param {string} color */
	const box = (r, color) => {
		ctx.strokeStyle = color;
		ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, r.width, r.height);
	};
	box(jikiHitbox(), '#f44');
	for (const t of tekis) box(tekiHurtbox(t), '#ff4');
	if (teki2) box(tekiHurtbox(teki2), '#ff4');
	if (boss && boss.dieTimer === 0) box(bossBodyBox(boss), '#f84');
	for (const s of bossShots) box(s, '#f84');
}

// 検証・デバッグ用の窓口(classicの window.ridge と同じ思想)
window.jibfreak = {
	debug: {
		get stepFlg() {
			return flow.stepFlg;
		},
		state,
		jiki,
		tekis,
		get teki2() {
			return teki2;
		},
		get jikiHitbox() {
			return jikiHitbox();
		},
		get activeShots() {
			return countActiveShots();
		},
		get enemyCount() {
			return tekis.length + (teki2 ? 1 : 0);
		},
		get pwrCount() {
			return pwrs.length;
		},
		get boss() {
			return boss;
		},
		get bossShotCount() {
			return bossShots.length;
		},
		get score() {
			return getScore();
		},
		get hiScore() {
			return getHiScore();
		},
		get selectedStage() {
			return selectedStage;
		},
		get stage2Unlocked() {
			return stage2Unlocked;
		},
		get soundMuted() {
			return isMuted();
		},
		get soundRequests() {
			return soundRequests();
		},
		get shotXs() {
			return activeShotXs();
		},
	},
};
