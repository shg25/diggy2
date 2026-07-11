import { BOMB_DURATION_MS } from './const.js';
import { state } from './state.js';
import { jiki, boss, groupBossSh, jikiSh1, jikiSh2, jikiSh3, numJikiSh1, numJikiSh2, numJikiSh3 } from './sprite.js';
import { STEP_TITLE, stepFlg, isPlay, goReady } from './step.js';
import { changeStage } from './stage.js';

// ショット変更
export function chJikiSh() {
	if (state.jikiShFlg !== 3) state.jikiShFlg += 1;
	else state.jikiShFlg = 0;
}

// スピード変更
export function chVelJiki() {
	if (state.velJiki === 5) state.velJiki = 10;
	else if (state.velJiki === 10) state.velJiki = 30;
	else if (state.velJiki === 30) state.velJiki = 1;
	else if (state.velJiki === 1) state.velJiki = 5;
}

// ボム
export function rmGroupTeki() {
	if (boss.get('active')) {
		DGE.Sprite.execByProperty('group', groupBossSh, 'remove');
	}
	state.bombTeki = 1;
	setTimeout(function() {
		state.bombTeki = 0;
	}, BOMB_DURATION_MS);
}

// --------------------------------------------------
// ショット撃つ
function makeJikiSh() {
	if (state.jikiShFlg === 3) {
		shotJikiSh(3, numJikiSh3); // 3方向
		return;
	}
	shotJikiSh(1, numJikiSh1); // 前
	if (state.jikiShFlg === 2) shotJikiSh(2, numJikiSh2); // 後
}

function shotJikiSh(type, num) {
	for (let i = 0; i < num; i++) {
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
				for (let n = 0; n < numJikiSh3; n++) {
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
export function eventKeyDown(keyCode) {
	if (keyCode === DGE.Keyboard.SPACE) {
		if (stepFlg === STEP_TITLE) goReady();
		if (isPlay()) makeJikiSh();
	}

	const KEYCODE_S = 83;
	const KEYCODE_Z = 90;
	const KEYCODE_B = 66;

	if (keyCode === KEYCODE_S) {
		if (stepFlg === STEP_TITLE) changeStage();
		if (isPlay()) chVelJiki(); // 隠しコマンド
	}
	if (keyCode === KEYCODE_Z && isPlay()) chJikiSh(); // 隠しコマンド
	if (keyCode === KEYCODE_B && isPlay()) rmGroupTeki(); // 隠しコマンド
}
