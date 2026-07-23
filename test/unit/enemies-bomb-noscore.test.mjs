// 大掃除#1後の追加(会長指摘): ボム(rmGroupTeki)による一掃はスコアを
// 入れない——一気に大量加算されるとハイスコア狙いがボムありきに
// なってしまうため。通常撃破は従来どおり加点することも合わせて確認。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../../jibfreak/js/state.js';
import { tekis, resetTekis, tickTekis, rmGroupTeki } from '../../jibfreak/js/enemies.js';
import { jikiSh1, resetJiki } from '../../jibfreak/js/player.js';
import { getScore, resetScore } from '../../jibfreak/js/hud.js';

/** @param {number} x @param {number} y */
function tekiAt(x, y) {
	return {
		x,
		y,
		width: 16,
		height: 16,
		velocity: 0,
		angle: 0,
		active: true,
		imageKey: '',
		life: 1,
		score: 50,
		dieTimer: 0,
	};
}

test('ボムでの撃破はスコアを入れない', () => {
	resetTekis();
	resetJiki();
	resetScore();
	tekis.push(tekiAt(300, 200));
	state.numTeki = 1;

	rmGroupTeki(); // state.bombTeki をゲーム内時間で立てる
	tickTekis();

	assert.equal(getScore(), 0, 'ボムでスコアが入ってしまった');
	assert.equal(state.numTeki, 0, '敵が消えていない');
	resetTekis();
	resetJiki();
	resetScore();
});

test('通常撃破は従来どおりスコアが入る', () => {
	resetTekis();
	resetJiki();
	resetScore();
	tekis.push(tekiAt(300, 200));
	state.numTeki = 1;
	jikiSh1[0].active = true;
	jikiSh1[0].x = 300;
	jikiSh1[0].y = 200;

	tickTekis();

	assert.equal(getScore(), 50, '通常撃破でスコアが入らない');
	resetTekis();
	resetJiki();
	resetScore();
});
