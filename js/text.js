export const STATE_SET = 0;
export const STATE_SHOW = 1;

const FONT = 'verdana';
export let txtAlert;
export let txtScore;
export let txtStage;

export function newTxtAlert(text) {
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

export function setTxtAlert(text, x, y, state) {
	txtAlert.set('text', text);
	if(state === STATE_SET) {
		txtAlert.plot(x, y);
	}else if(state === STATE_SHOW) {
		txtAlert.plot(x, y).show();
	}
}

// --------------------------------------------------

export function newTxtScore(text) {
	txtScore = new DGE.Text({
		font : FONT, text : text, width : 200, height : 20,
		x : 5, y : 5, z : 3,
		points : 0
	});
}

export function setTxtScore(i) {
	txtScore.set('points', txtScore.get('points') + i);
	txtScore.set('text', DGE.sprintf('Score: %s', DGE.formatNumber(txtScore.get('points'))));
}

// --------------------------------------------------

export function newTxtStage(text) {
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
