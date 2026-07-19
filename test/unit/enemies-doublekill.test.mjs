// 大掃除#1(外部顧問の指摘)の再現テスト: 同一tickで通常弾とレーザーが
// 同じ敵に当たると banTeki が2回走り、スコア二重加算と numTeki の
// 負数化が起きていた。ガード追加後は1回だけ数えることを確かめる。
// 本物のモジュールの共有オブジェクト(tekis・ショットプール)を直接使う。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../../jibfreak/js/state.js';
import { tekis, resetTekis, tickTekis } from '../../jibfreak/js/enemies.js';
import { jikiSh1, jikiSh3, resetJiki } from '../../jibfreak/js/player.js';
import { getScore, resetScore } from '../../jibfreak/js/hud.js';

test('同一tickに通常弾とレーザーが重なっても二重撃破しない', () => {
	resetTekis();
	resetJiki();
	resetScore();
	tekis.push({
		x: 300,
		y: 200,
		width: 16,
		height: 16,
		velocity: 0,
		angle: 0,
		active: true,
		imageKey: '',
		life: 1,
		score: 50,
		dieTimer: 0,
	});
	state.numTeki = 1;
	// 通常弾とレーザーを敵と同じ場所に重ねる(レーザーは貫通するので
	// 通常弾の撃破後も当たり判定が走る——これが二重撃破の再現条件)
	jikiSh1[0].active = true;
	jikiSh1[0].x = 300;
	jikiSh1[0].y = 200;
	jikiSh3[0].active = true;
	jikiSh3[0].x = 300;
	jikiSh3[0].y = 200;

	tickTekis();

	assert.equal(getScore(), 50, 'スコアが二重加算された');
	assert.equal(state.numTeki, 0, 'numTeki が二重減算された');
	resetTekis();
	resetJiki();
	resetScore();
});
