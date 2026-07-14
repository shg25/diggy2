// JIB-FREAK MOBILE エントリポイント。
// タイトル → READY → START(戦闘) → LOSE(GAME OVER) → タイトル、まで移植済み。
// アイテム・ボス・勝利はこれから。
// flow.js / state.js / const.js は classic から1文字も変えずに使っている。
import { createScreen, WIDTH, HEIGHT } from './engine/screen.js';
import { startLoop } from './engine/loop.js';
import {
	initInput,
	wasPressed,
	isDown,
	isPointerDown,
	consumeTaps,
	suppressCurrentPointer,
	flushInput,
} from './engine/input.js';
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
import { tekis, teki2, resetTekis, drawTekis, rmGroupTeki } from './enemies.js';
import { pwrs, resetPwrs, drawPwrs } from './items.js';
import {
	boss,
	bossShots,
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

const parent = document.getElementById('screen');
if (!parent) throw new Error('#screen がない');
const ctx = createScreen(parent);
initInput();

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
const images = await loadImages(sources);

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
	// ステージ1を初めてクリアしたらステージ2が解放される(苦労の報酬)
	if (state.stageFlg === 1 && !stage2Unlocked) {
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
	state.velJiki = 5;
	state.jikiShFlg = 1;
	resetTekis();
	resetPwrs();
	resetBoss();
	resetStage();
	setStep(STEP_TITLE);
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

// 画面上ボタン(⏸と♪)。常時表示(会長答弁: 画面判定は極力減らす)
function drawButtons() {
	/** @type {[{ x: number, y: number, w: number, h: number }, string, boolean][]} */
	const buttons = [
		[PAUSE_BTN, 'II', true],
		[SOUND_BTN, '♪', !isMuted()],
	];
	for (const [btn, label, on] of buttons) {
		ctx.strokeStyle = on ? '#889' : '#454c5c';
		ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
		ctx.fillStyle = on ? '#ccd' : '#454c5c';
		ctx.font = '12px Verdana, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(String(label), btn.x + btn.w / 2, btn.y + 15);
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
			// ステージ選択(解放済みのときだけカーソルが動く)
			if (stage2Unlocked && (wasPressed('up') || wasPressed('down'))) {
				selectedStage = selectedStage === 1 ? 2 : 1;
			}
			if (wasPressed('action') || tapAction) {
				// classic の goReady 相当: スコアを戻し、2秒の READY? を挟んで開始
				state.stageFlg = selectedStage;
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
				if (winTimer <= 0) returnToTitle();
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
			text('JIB-FREAK', 150, 48, '#3c9');
			text('MOBILE', 195, 30, '#3c9');
			const bob = Math.sin(time * 2) * 8;
			ctx.drawImage(frameOf(images[JIKI_IMAGE], tMs), WIDTH / 2 - 16, 212 + bob);

			// ステージ選択メニュー(カーソルは20年前の未使用素材 arrow.gif)
			const menuY = [272, 296];
			text('STAGE 1', menuY[0], 14, selectedStage === 1 ? '#fff' : '#889');
			if (stage2Unlocked) {
				text('STAGE 2', menuY[1], 14, selectedStage === 2 ? '#fff' : '#889');
			} else {
				text('STAGE 2', menuY[1], 14, '#454c5c');
				text('(STAGE 1 をクリアで解放)', menuY[1] + 14, 9, '#556');
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
				text('スペース or タップ で開始', 336, 12, '#fff');
			}
			text(
				`↑↓: ステージ選択 / ゲーム中 矢印: 移動 スペース: 射撃 P: ポーズ / M: 音(${isMuted() ? 'OFF' : 'ON'})`,
				362,
				10,
				'#889',
			);
			text('CLASSIC: RIDGE部 → ../classic/', 385, 10, '#667');
			drawHud(ctx);
			drawButtons();
		} else {
			drawPwrs(ctx, images, tMs);
			drawTekis(ctx, images, tMs);
			drawBoss(ctx, images, tMs);
			drawPlayer(ctx, images, tMs);
			drawHud(ctx);
			drawButtons();
			text(
				`移動: 矢印 / 射撃: スペース or タップ / P: ポーズ / M: 音(${isMuted() ? 'OFF' : 'ON'})`,
				385,
				10,
				'#667',
			);
			if (flow.stepFlg === STEP_PAUSE) {
				// 薄暗くして PAUSE(会長答弁: 演出は暗転、再開は即時)
				ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
				ctx.fillRect(0, 0, WIDTH, HEIGHT);
				text('PAUSE', 200, 24, '#fff');
				text('P で再開', 225, 11, '#aab');
			} else if (flow.stepFlg === STEP_READY) {
				text('READY?', 200, 20, '#fff');
			} else if (flow.stepFlg === STEP_START && goTimer > 0) {
				text('GO!!', 200, 20, '#fff');
			} else if (flow.stepFlg === STEP_WIN) {
				text('YOU WIN', 200, 20, '#fff');
				if (isNewRecord()) text('NEW RECORD!', 230, 14, '#fc6');
				if (unlockedNow) text('STAGE 2 が解放された!', 254, 14, '#3c9');
			} else if (flow.stepFlg === STEP_LOSE) {
				text('GAME OVER', 200, 20, '#fff');
				if (isNewRecord()) text('NEW RECORD!', 230, 14, '#fc6');
			}
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
