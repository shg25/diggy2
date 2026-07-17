// 第6回生徒会「当たり判定」の矩形計算のテスト。
// 見た目(画像矩形)と判定の分離が正しい座標になっているかを、
// ゲームを起動せずに entity.js / defs.js だけで検証する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { centerBox, isTouching } from '../../jibfreak/js/entity.js';
import { HIT_DEFS } from '../../jibfreak/js/defs.js';

test('centerBox: 中心を保って小さくする(自機 32x32 → 8x8)', () => {
	const jiki = { x: 100, y: 200, width: 32, height: 32 };
	const box = centerBox(jiki, HIT_DEFS.jiki.width, HIT_DEFS.jiki.height);
	assert.deepEqual(box, { x: 112, y: 212, width: 8, height: 8 });
});

test('centerBox: 中心を保って大きくする(敵 16x16 → 各辺+4px)', () => {
	const teki = { x: 300, y: 100, width: 16, height: 16 };
	const m = HIT_DEFS.tekiMargin;
	const box = centerBox(teki, teki.width + m * 2, teki.height + m * 2);
	assert.deepEqual(box, { x: 296, y: 96, width: 24, height: 24 });
});

test('自機のスプライト端をかすめても弱点には触れない', () => {
	const jiki = { x: 100, y: 100, width: 32, height: 32 };
	const core = centerBox(jiki, HIT_DEFS.jiki.width, HIT_DEFS.jiki.height); // 112..120
	// 敵 16x16 が自機スプライトの左上角に重なる(見た目は接触)
	const grazer = { x: 92, y: 92, width: 16, height: 16 }; // 92..108 < 112
	assert.equal(isTouching(grazer, jiki), true, '見た目では触れている');
	assert.equal(isTouching(grazer, core), false, '弱点には触れていない');
	// 中心に重なれば被弾
	const direct = { x: 108, y: 108, width: 16, height: 16 }; // 108..124 ∋ 112
	assert.equal(isTouching(direct, core), true);
});

test('敵の被弾判定は画像の外 4px まで甘い(擦り抜け感の解消)', () => {
	const teki = { x: 300, y: 100, width: 16, height: 16 };
	const m = HIT_DEFS.tekiMargin;
	const hurt = centerBox(teki, teki.width + m * 2, teki.height + m * 2);
	// 弾 8x8 が画像の右に 2px 離れて並ぶ(見た目はギリギリ外)
	const shot = { x: 318, y: 100, width: 8, height: 8 };
	assert.equal(isTouching(shot, teki), false, '画像どうしは離れている');
	assert.equal(isTouching(shot, hurt), true, '甘い判定では当たる');
	// 5px 離れたら甘い判定でも外
	const far = { x: 321, y: 100, width: 8, height: 8 };
	assert.equal(isTouching(far, hurt), false);
});

test('ボスの体当たり判定は各辺 16px 狭い(透明部分で死なない)', () => {
	const boss = { x: 0, y: 300, width: 278, height: 65 };
	const m = HIT_DEFS.bossBodyMargin;
	const body = centerBox(boss, boss.width - m * 2, boss.height - m * 2);
	assert.deepEqual(body, { x: 16, y: 316, width: 246, height: 33 });
	// 自機の弱点 8x8 がボス画像の縁にだけ重なるケース
	const coreOnEdge = { x: 4, y: 320, width: 8, height: 8 }; // 4..12 < 16
	assert.equal(isTouching(coreOnEdge, boss), true, '画像には触れている');
	assert.equal(isTouching(coreOnEdge, body), false, '体には触れていない');
});

test('猫バスの縦向き(width/height 入れ替え)にも追従する', () => {
	const neko = { x: 0, y: 0, width: 120, height: 222 }; // turnMode 1 の縦向き
	const m = HIT_DEFS.bossBodyMargin;
	const body = centerBox(neko, neko.width - m * 2, neko.height - m * 2);
	assert.deepEqual(body, { x: 16, y: 16, width: 88, height: 190 });
});
