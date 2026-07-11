import { STATE_SET, STATE_SHOW, txtAlert, txtScore, newTxtAlert, setTxtAlert, newTxtScore, setTxtScore, newTxtStage } from './text.js';
import { logo, jiki, newSpriteBg, newSpriteLogo, newSpriteJiki, defineJikiSh, removeJiki, getoutBoss, resetSprite, newSpriteBoss } from './sprite.js';
import { moveJiki, startStage, stopStage } from './stage.js';

export let stepFlg = 0;

export const STEP_TITLE  = 0;
export const STEP_RETURN = 1;
export const STEP_READY  = 10;
export const STEP_START  = 11;
export const STEP_COME   = 12;
export const STEP_BATTLE = 13;
export const STEP_WIN    = 14;
export const STEP_LOSE   = 19;

export function isPlay() {
	if(stepFlg === STEP_READY || stepFlg === STEP_START || stepFlg === STEP_COME || stepFlg === STEP_BATTLE || stepFlg === STEP_WIN) {
		return true;
	}
	return false;
}

export function isFight() {
	if(stepFlg === STEP_START || stepFlg === STEP_COME || stepFlg === STEP_BATTLE) {
		return true;
	}
	return false;
}

export function isFightBoss() {
	if(stepFlg === STEP_COME || stepFlg === STEP_BATTLE) {
		return true;
	}
	return false;
}

function setStep(step) {
	stepFlg = step;
	if (step === STEP_TITLE) console.log('goTitle');
	else if (step === STEP_RETURN) console.log('goReturn');
	else if (step === STEP_READY) console.log('goReady');
	else if (step === STEP_START) console.log('goStart');
	else if (step === STEP_COME) console.log('goCome');
	else if (step === STEP_BATTLE) console.log('goBattle');
	else if (step === STEP_WIN) console.log('goWin');
	else if (step === STEP_LOSE) console.log('goLose');
	else console.log('go????');
}

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
