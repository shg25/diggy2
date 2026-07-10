'use strict';

// ショット変更
function chJikiSh() {
	if (jikiShFlg !== 3) jikiShFlg += 1;
	else jikiShFlg = 0;
}

// スピード変更
function chVelJiki() {
	if (velJiki === 5) velJiki = 10;
	else if (velJiki === 10) velJiki = 30;
	else if (velJiki === 30) velJiki = 1;
	else if (velJiki === 1) velJiki = 5;
}

// ボム
function rmGroupTeki() {
	if (boss.get('active')) {
		DGE.Sprite.execByProperty('group', groupBossSh, 'remove');
	}
	bombTeki = 1;
	setTimeout(function() {
		bombTeki = 0;
	}, BOMB_DURATION_MS);
}

// --------------------------------------------------
// ショット撃つ
function makeJikiSh() {
	if (jikiShFlg === 3) { 
		shotJikiSh(3, numJikiSh3); // 3方向
		return;
	}
	shotJikiSh(1, numJikiSh1); // 前
	if (jikiShFlg === 2) shotJikiSh(2, numJikiSh2); // 後
};

function shotJikiSh(type, num) {
	for (var i = 0; i < num; i++) {
		if(type === 1) {
			if (!jikiSh1[i].get('active')) {
				startJikiSh(jikiSh1[i], 1);
				break;
			}
		} else if(type === 2) {
			if (!jikiSh2[i].get('active')) {
				startJikiSh(jikiSh2[i], 2);
				break;
			}
		} else if(type === 3) {
			if (!jikiSh3[i].get('active') && !jikiSh3[i + 1].get('active') && !jikiSh3[i + 2].get('active')) {
				for (var n = 0; n < numJikiSh3; n++) {
					jikiSh3[i + n].set('angle', 150 + 30 * n);
					startJikiSh(jikiSh3[i + n], 3);
				}
			}
			break;
		}
	}
}

function startJikiSh(shot, i) {
	if(i === 1 || i === 3) {
		shot.plot((jiki.x + jiki.width), (jiki.y + 12));
	} else if(i === 2) {
		shot.plot((jiki.x), (jiki.y + 12));
	}
	shot.show();
	shot.start();
}

// --------------------------------------------------
// キーボード操作
function eventKeyDown(keyCode) {
	if (keyCode === DGE.Keyboard.SPACE) {
		if (stepFlg === STEP_TITLE) goReady();
		if (isPlay()) makeJikiSh();
	}
	
	var KEYCODE_S = 83;
	var KEYCODE_Z = 90;
	var KEYCODE_B = 66;
	
	if (keyCode === KEYCODE_S) {
		if (stepFlg === STEP_TITLE) changeStage();
		if (isPlay()) chVelJiki(); // 隠しコマンド
	}
	if (keyCode === KEYCODE_Z && isPlay()) chJikiSh(); // 隠しコマンド
	if (keyCode === KEYCODE_B && isPlay()) rmGroupTeki(); // 隠しコマンド
}
