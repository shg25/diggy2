// 第7回生徒会「アトラクトモード」の自動操縦ルールのテスト。
// autopilot は状況(自機・敵の位置)を読んで論理アクションを返す
// 純粋な計算なので、ゲームを起動せずに検証できる。
// jiki と tekis は本物のモジュールの共有オブジェクトを直接動かす。
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { autopilotActions } from '../../jibfreak/js/autopilot.js';
import { jiki } from '../../jibfreak/js/player.js';
import { tekis } from '../../jibfreak/js/enemies.js';

/** 16x16 の敵を作る(中心が cx, cy に来るように置く) */
function tekiAt(cx, cy) {
	return {
		x: cx - 8,
		y: cy - 8,
		width: 16,
		height: 16,
		velocity: 0,
		angle: 0,
		active: true,
		imageKey: '',
		life: 1,
		score: 0,
		dieTimer: 0,
	};
}

beforeEach(() => {
	tekis.length = 0;
});

test('常に撃つ(ルール3)', () => {
	jiki.x = 120 - 16;
	jiki.y = 200 - 16; // 定位置に置く
	assert.ok(autopilotActions().includes('action'));
});

test('脅威がなければ定位置(左中央)へ向かう(ルール2)', () => {
	jiki.x = 400;
	jiki.y = 40; // 中心 (416, 56)。定位置 (120, 200) は左下
	const a = autopilotActions();
	assert.ok(a.includes('left'), '左へ向かわない');
	assert.ok(a.includes('down'), '下へ向かわない');
});

test('定位置に着いたら動かない(ふらつき防止)', () => {
	jiki.x = 120 - 16;
	jiki.y = 200 - 16; // 中心がぴったり定位置
	assert.deepEqual(autopilotActions(), ['action']);
});

test('近い敵の反対方向へ逃げる(ルール1が定位置より強い)', () => {
	jiki.x = 284;
	jiki.y = 184; // 中心 (300, 200)
	tekis.push(tekiAt(350, 230)); // 右下50px×30px、距離約58 < DANGER 90
	const a = autopilotActions();
	assert.ok(a.includes('left'), '脅威の反対(左)へ逃げない');
	assert.ok(a.includes('up'), '脅威の反対(上)へ逃げない');
});

test('遠い敵は無視して定位置へ戻る', () => {
	jiki.x = 284;
	jiki.y = 184; // 中心 (300, 200)。定位置は左
	tekis.push(tekiAt(560, 200)); // 距離260 > DANGER 90
	const a = autopilotActions();
	assert.ok(a.includes('left'), '定位置(左)へ向かわない');
	assert.ok(!a.includes('right'), '遠い敵から逃げてしまっている');
});

test('やられ演出中の敵は脅威に数えない', () => {
	jiki.x = 284;
	jiki.y = 184;
	const t = tekiAt(350, 200);
	t.dieTimer = 0.5; // 爆発中
	tekis.push(t);
	const a = autopilotActions();
	assert.ok(a.includes('left'), '爆発から逃げずに定位置へ向かうべき');
	assert.ok(!a.includes('up') && !a.includes('down'), 'y は定位置と同じ高さ');
});

test('画面端には自分から逃げ込まない', () => {
	jiki.x = 30 - 16;
	jiki.y = 50 - 16; // 中心 (30, 50)、左上の隅ぎわ
	tekis.push(tekiAt(80, 90)); // 右下から接近
	const a = autopilotActions();
	// 素直に「反対方向」なら左上だが、EDGE 40 で頭打ちになり
	// x は 40 へ(=右)、y は 40 へ(=上のまま少し)行く
	assert.ok(a.includes('right'), '左端に張り付こうとした');
});
