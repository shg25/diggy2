'use strict';

var STATE_SET = 0;
var STATE_SHOW = 1;

var FONT = 'verdana';
var txtAlert;
var txtScore;
var txtStage;

function newTxtAlert(text) {
	// 2回目以降は作り直さず、初回に作ったものを使い回す
	if (txtAlert) {
		setTxtAlert(text, 280, 160, STATE_SHOW);
		return;
	}
	txtAlert = new DGE.Text({
		font : FONT,
		text : text,
		width : 100,
		height : 20,
		x : 280,
		y : 160,
		z : 3
	});
}

function setTxtAlert(text, x, y, state) {
	txtAlert.set('text', text);
	if(state === STATE_SET) {
		txtAlert.plot(x, y);
	}else if(state === STATE_SHOW) {
		txtAlert.plot(x, y).show();
	}
}

// --------------------------------------------------

function newTxtScore(text) {
	txtScore = new DGE.Text({
		font : FONT, text : text, width : 200, height : 20,
		x : 5, y : 5, z : 3,
		points : 0
	});
}

function setTxtScore(i) {
	txtScore.set('points', txtScore.get('points') + i);
	txtScore.set('text', DGE.sprintf('Score: %s', DGE.formatNumber(txtScore.get('points'))));
}


// --------------------------------------------------

function newTxtStage(text) {
	txtStage = new DGE.Text({
		font : FONT,
		text : text,
		width : 55,
		height : 20,
		x : 545,
		y : 5,
		z : 3
	});
}
