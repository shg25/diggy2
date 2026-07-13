// jibfreak 版 flow.js の単体テスト。classic 版との差分(win フック、
// STEP_PAUSE)があるため、classic 用(flow.test.mjs)とは別に検証する。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
	STEP_PAUSE,
	STEP_TITLE,
	setStep,
	stepFlg,
	isPlay,
	isFight,
	isFightBoss,
	transitions,
} from '../../jibfreak/js/flow.js';

test('STEP_PAUSE は isPlay / isFight / isFightBoss のどれでもない', () => {
	setStep(STEP_PAUSE);
	assert.equal(stepFlg, STEP_PAUSE);
	assert.equal(isPlay(), false, 'ポーズ中に射撃できてしまう');
	assert.equal(isFight(), false, 'ポーズ中に湧き・接触が起きてしまう');
	assert.equal(isFightBoss(), false);
	setStep(STEP_TITLE);
});

test('win フックは登録・発火できる(classic に無い divergence)', () => {
	let called = 0;
	const original = transitions.win;
	transitions.win = () => {
		called++;
	};
	transitions.win();
	assert.equal(called, 1);
	transitions.win = original;
});
