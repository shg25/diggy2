import { STEP_TITLE, STEP_RETURN, STEP_READY, STEP_START, STEP_COME, STEP_BATTLE, STEP_WIN, STEP_LOSE, setStep, transitions } from './flow.js';
import { STATE_SET, STATE_SHOW, txtAlert, txtScore, newTxtAlert, setTxtAlert, newTxtScore, setTxtScore, newTxtStage } from './text.js';
import { logo, jiki, newSpriteBg, newSpriteLogo, newSpriteJiki, defineJikiSh, removeJiki, getoutBoss, resetSprite, newSpriteBoss } from './sprite.js';
import { moveJiki, startStage, stopStage } from './stage.js';

// 下位レイヤーが発火する場面遷移に、実体を結びつける
transitions.come = goCome;
transitions.battle = goBattle;
transitions.lose = goLose;

// --------------------------------------------------
// 初期設定
export function init() {
	DGE.init({
		id : 'screen',
		background : '#000',
		width : 600, height : 400
	});

	new DGE.Loader([
		'gfx/title/logo.gif', 'gfx/bg.gif',
		'gfx/teki/61/l_1.gif', 'gfx/teki/61/l_2.gif', 'gfx/teki/61/l_3.gif'
	]);

	newTxtScore('Score: 0');
	newTxtStage('STAGE 1');
	newSpriteBg();

	goTitle();
}

// タイトル
export function goTitle() {
	setStep(STEP_TITLE);
	newSpriteLogo();
}

// リターン
export function goReturn() {
	setStep(STEP_RETURN);
	resetSprite();
	goTitle();
}

// 準備
export function goReady() {
	setStep(STEP_READY);
	logo.remove();
	setTxtScore(txtScore.get('points') * -1);
	newTxtAlert('READY?');
	newSpriteJiki();
	defineJikiSh();
	moveJiki.start();
	setTimeout(function() {
		goStart();
	}, 2000);
}

// 開始
export function goStart() {
	setStep(STEP_START);
	setTxtAlert('GO!!', 290, 160, STATE_SET);
	setTimeout(function() {
		txtAlert.hide();
		startStage();
	}, 1000);
}

// ボス登場
export function goCome() {
	setStep(STEP_COME);
	newSpriteBoss();
}

// ボス戦
export function goBattle() {
	setStep(STEP_BATTLE);
}

// ボス撃破
export function goWin() {
	setStep(STEP_WIN);
	setTxtAlert('YOU WIN', 270, 160, STATE_SHOW);
	setTimeout(function() {
		jiki.remove();
		txtAlert.hide();
		stopStage();
		goReturn();
	}, 5000);
}

// 負け
export function goLose() {
	setStep(STEP_LOSE);
	if (moveJiki.get('active')) moveJiki.stop();
	removeJiki();
	getoutBoss();
	setTxtAlert('GAME OVER', 270, 160, STATE_SHOW);
	setTimeout(function() {
		txtAlert.hide();
		stopStage();
		goReturn();
	}, 3000);
}
