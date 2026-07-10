'use strict';

var stepFlg = 0;

var STEP_TITLE  = 0;
var STEP_RETURN = 1;
var STEP_READY  = 10;
var STEP_START  = 11;
var STEP_COME   = 12;
var STEP_BATTLE = 13;
var STEP_WIN    = 14;
var STEP_LOSE   = 19;

function isPlay() {
	if(stepFlg === STEP_READY || stepFlg === STEP_START || stepFlg === STEP_COME || stepFlg === STEP_BATTLE || stepFlg === STEP_WIN) {
		return true;
	}
	return false;
}

function isFight() {
	if(stepFlg === STEP_START || stepFlg === STEP_COME || stepFlg === STEP_BATTLE) {
		return true;
	}
	return false;
}

function isFightBoss() {
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
function init() {
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
	keyboard = DGE.Keyboard;
	
	goTitle();
};

// タイトル
function goTitle() {
	setStep(STEP_TITLE);
	newSpriteLogo();
};

// リターン
function goReturn() {
	setStep(STEP_RETURN);
	resetSprite();
	goTitle();
}

// 準備
function goReady() {
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
};

// 開始
function goStart() {
	setStep(STEP_START);
	setTxtAlert('GO!!', 290, 160, STATE_SET);
	setTimeout(function() {
		txtAlert.hide();
		startStage();
	}, 1000);
};

// ボス登場
function goCome() {
	setStep(STEP_COME);
	newSpriteBoss();
};

// ボス戦
function goBattle() {
	setStep(STEP_BATTLE);
};

// ボス撃破
function goWin() {
	setStep(STEP_WIN);
	setTxtAlert('YOU WIN', 270, 160, STATE_SHOW);
	setTimeout(function() {
		jiki.remove();
		txtAlert.hide();
		stopStage();
		goReturn();
	}, 5000);
};

// 負け
function goLose() {
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
};
