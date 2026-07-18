// 第7回生徒会「アトラクトモード」の自動操縦ルールのテスト。
// autopilot は状況(自機・敵の位置)を読んで論理アクションを返す
// 純粋な計算なので、ゲームを起動せずに検証できる。
// jiki と tekis は本物のモジュールの共有オブジェクトを直接動かす。
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { autopilotActions, resetAutopilot } from '../../jibfreak/js/autopilot.js';
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
	resetAutopilot();
});

test('常に撃つ(ルール3)', () => {
	jiki.x = 120 - 16;
	jiki.y = 200 - 16; // 定位置に置く
	assert.ok(autopilotActions(1).includes('action'));
});

test('脅威がなければ定位置(左中央)へ向かう(ルール2)', () => {
	jiki.x = 400;
	jiki.y = 40; // 中心 (416, 56)。定位置 (120, 200) は左下
	const a = autopilotActions(1);
	assert.ok(a.includes('left'), '左へ向かわない');
	assert.ok(a.includes('down'), '下へ向かわない');
});

test('定位置に着いたら動かない(ふらつき防止)', () => {
	jiki.x = 120 - 16;
	jiki.y = 200 - 16; // 中心がぴったり定位置
	assert.deepEqual(autopilotActions(1), ['action']);
});

test('近い敵の反対方向へ逃げる(ルール1が定位置より強い)', () => {
	jiki.x = 284;
	jiki.y = 184; // 中心 (300, 200)
	tekis.push(tekiAt(350, 230)); // 右下50px×30px、距離約58 < DANGER 90
	const a = autopilotActions(1);
	assert.ok(a.includes('left'), '脅威の反対(左)へ逃げない');
	assert.ok(a.includes('up'), '脅威の反対(上)へ逃げない');
});

test('遠い敵は無視して定位置へ戻る', () => {
	jiki.x = 284;
	jiki.y = 184; // 中心 (300, 200)。定位置は左
	tekis.push(tekiAt(560, 200)); // 距離260 > DANGER 90
	const a = autopilotActions(1);
	assert.ok(a.includes('left'), '定位置(左)へ向かわない');
	assert.ok(!a.includes('right'), '遠い敵から逃げてしまっている');
});

test('やられ演出中の敵は脅威に数えない', () => {
	jiki.x = 284;
	jiki.y = 184;
	const t = tekiAt(350, 200);
	t.dieTimer = 0.5; // 爆発中
	tekis.push(t);
	const a = autopilotActions(1);
	assert.ok(a.includes('left'), '爆発から逃げずに定位置へ向かうべき');
	assert.ok(!a.includes('up') && !a.includes('down'), 'y は定位置と同じ高さ');
});

test('判断は間隔を置いて行い、間は前回の操作を続ける(会長発議)', () => {
	jiki.x = 400;
	jiki.y = 40; // 定位置は左下 → left/down のはず
	const first = autopilotActions(0.05); // 判断が走る
	assert.ok(first.includes('left'));
	jiki.x = 0;
	jiki.y = 350; // 状況が変わっても…
	const held = autopilotActions(0.05); // …間隔内は前回の操作のまま
	assert.deepEqual(held, first, '間隔内なのに判断し直した');
	const fresh = autopilotActions(1); // 間隔を過ぎれば判断し直す
	assert.ok(fresh.includes('right'), '新しい状況(右上へ)を判断していない');
	assert.ok(fresh.includes('up'));
});

test('引き返しの禁止: 逃げ直すときは前回と別の角度へ(会長発議3)', () => {
	jiki.x = 284;
	jiki.y = 184; // 中心 (300, 200)
	tekis.push(tekiAt(350, 200)); // 右の近い脅威 → 左(と上)へ回避
	const dodge = autopilotActions(1);
	assert.ok(dodge.includes('left'));
	tekis.length = 0;
	tekis.push(tekiAt(250, 240)); // 今度は左下に脅威。素直なら右へ引き返す形
	const second = autopilotActions(0.3); // 記憶(0.6秒)の内
	assert.ok(!second.includes('right'), '来た道を引き返した(往復が起きる)');
	assert.ok(second.includes('up'), '別の角度(上)へ逃げていない');
});

test('引き返しの禁止は0.6秒で忘れ、また素直に逃げられる', () => {
	jiki.x = 284;
	jiki.y = 184; // 中心 (300, 200)
	tekis.push(tekiAt(350, 200)); // 右の脅威 → 左へ回避
	autopilotActions(1);
	tekis.length = 0;
	tekis.push(tekiAt(250, 200)); // 左の脅威
	const fresh = autopilotActions(1); // 記憶(0.6秒)が切れている
	assert.ok(fresh.includes('right'), '記憶が切れたのに引き返せない');
});

test('真後ろへ引き返す形になったら、上下の広い方へ逃げ直す', () => {
	jiki.x = 284;
	jiki.y = 84; // 中心 (300, 100)。画面上半分
	tekis.push(tekiAt(350, 150)); // 右下の脅威 → 左上へ回避
	const dodge = autopilotActions(1);
	assert.ok(dodge.includes('left') && dodge.includes('up'));
	tekis.length = 0;
	tekis.push(tekiAt(250, 50)); // 左上の脅威。素直なら右下 = 真後ろへ引き返す形
	const second = autopilotActions(0.3);
	assert.ok(!second.includes('right') && !second.includes('left'), '横成分は捨てるべき');
	assert.ok(second.includes('down'), '画面上半分にいるので下の広い方へ逃げるべき');
});

test('画面端には自分から逃げ込まない', () => {
	jiki.x = 30 - 16;
	jiki.y = 50 - 16; // 中心 (30, 50)、左上の隅ぎわ
	tekis.push(tekiAt(80, 90)); // 右下から接近
	const a = autopilotActions(1);
	// 素直に「反対方向」なら左上だが、EDGE 40 で頭打ちになり
	// x は 40 へ(=右)、y は 40 へ(=上のまま少し)行く
	assert.ok(a.includes('right'), '左端に張り付こうとした');
});
