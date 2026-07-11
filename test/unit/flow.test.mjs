// flow.js(状態機械)の単体テスト。
// flow.js は DGE にも DOM にも依存しないので、ブラウザなしで検証できる。
// 実行: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	STEP_TITLE,
	STEP_RETURN,
	STEP_READY,
	STEP_START,
	STEP_COME,
	STEP_BATTLE,
	STEP_WIN,
	STEP_LOSE,
	stepFlg,
	setStep,
	isPlay,
	isFight,
	isFightBoss,
	transitions,
} from '../../classic/js/flow.js';

test('初期状態はタイトル', () => {
	assert.equal(stepFlg, STEP_TITLE);
});

test('setStep で状態が変わる(live binding で読める)', () => {
	setStep(STEP_BATTLE);
	assert.equal(stepFlg, STEP_BATTLE);
	setStep(STEP_TITLE);
	assert.equal(stepFlg, STEP_TITLE);
});

test('isPlay / isFight / isFightBoss の真理値表', () => {
	// [状態, isPlay, isFight, isFightBoss]
	const table = [
		[STEP_TITLE, false, false, false],
		[STEP_RETURN, false, false, false],
		[STEP_READY, true, false, false],
		[STEP_START, true, true, false],
		[STEP_COME, true, true, true],
		[STEP_BATTLE, true, true, true],
		[STEP_WIN, true, false, false],
		[STEP_LOSE, false, false, false],
	];
	for (const [step, play, fight, fightBoss] of table) {
		setStep(step);
		assert.equal(isPlay(), play, `isPlay(${step})`);
		assert.equal(isFight(), fight, `isFight(${step})`);
		assert.equal(isFightBoss(), fightBoss, `isFightBoss(${step})`);
	}
	setStep(STEP_TITLE); // 後片付け
});

test('transitions は既定で安全な no-op、上位が実体を登録できる', () => {
	// 未登録のまま呼んでも例外にならない(登録前に発火しても壊れない)
	assert.doesNotThrow(() => {
		transitions.come();
		transitions.battle();
		transitions.lose();
	});

	// 登録すれば呼ばれる
	let called = 0;
	const original = transitions.lose;
	transitions.lose = () => {
		called++;
	};
	transitions.lose();
	assert.equal(called, 1);
	transitions.lose = original; // 後片付け
});
