// hud.js(スコアとハイスコアのロジック)の単体テスト。
// レイヤー分けのおかげで描画関数以外はブラウザなしで検証できる。
// localStorage が無い Node 環境では storage.js がメモリ退避に落ちるので、
// 「保存先が使えない環境でも壊れない」ことの検証を兼ねる。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addScore, resetScore, getScore, getHiScore, isNewRecord } from '../../jibfreak/js/hud.js';

test('スコアは加算され、リセットで0に戻る', () => {
	resetScore();
	addScore(100);
	addScore(250);
	assert.equal(getScore(), 350);
	resetScore();
	assert.equal(getScore(), 0);
});

test('ハイスコアは自己ベストを超えた瞬間に追従し、リセットでは消えない', () => {
	resetScore();
	const base = getHiScore();
	addScore(base + 500); // 確実にベスト更新
	assert.equal(getHiScore(), base + 500);
	assert.equal(isNewRecord(), true);

	resetScore(); // 新しいゲーム開始相当
	assert.equal(getScore(), 0);
	assert.equal(getHiScore(), base + 500, 'リセットでハイスコアが消えた');
	assert.equal(isNewRecord(), false, '新記録フラグはゲームごとに戻る');
});

test('ベストに届かないスコアではハイスコアは動かない', () => {
	resetScore();
	const best = getHiScore();
	addScore(1); // best は既に1より大きい(前のテストで更新済み)
	assert.equal(getHiScore(), best);
	assert.equal(isNewRecord(), false);
});
