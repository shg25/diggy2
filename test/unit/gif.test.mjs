// 自前GIFデコーダ(engine/gif.js)の単体テスト。
// パーサはDOMに依存しない純関数なので、実素材を読み込んで
// Node上で直接検証できる。期待コマ数は事前のバイト解析
// (Graphic Control Extension の出現数)と突き合わせている。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { parseGif } from '../../jibfreak/js/engine/gif.js';

const load = (/** @type {string} */ p) =>
	new Uint8Array(readFileSync(new URL(`../../jibfreak/gfx/${p}`, import.meta.url)));

test('やられ演出 ban.gif は7コマの爆発アニメ', () => {
	const gif = parseGif(load('ban.gif'));
	assert.equal(gif.frames.length, 7);
	assert.ok(gif.width > 0 && gif.height > 0);
});

test('自機 n.gif は2コマ(プロペラが回る)', () => {
	const gif = parseGif(load('jiki/n.gif'));
	assert.equal(gif.frames.length, 2);
	assert.equal(gif.width, 32);
	assert.equal(gif.height, 32);
});

test('猫バス l.gif は6コマ(歩く)', () => {
	const gif = parseGif(load('teki/61/l.gif'));
	assert.equal(gif.frames.length, 6);
});

test('全コマがRGBAとして正しいサイズで、絵のあるコマを含む', () => {
	// 注: 全コマに絵があるとは限らない。ban.gif(爆発)の最終コマは
	// 「何もない」が正しい内容——爆発は消えて終わる
	for (const p of ['ban.gif', 'jiki/n.gif', 'teki/0/l.gif', 'title/arrow.gif', 'bg.gif']) {
		const gif = parseGif(load(p));
		let framesWithArt = 0;
		for (const [i, frame] of gif.frames.entries()) {
			assert.equal(frame.rgba.length, gif.width * gif.height * 4, `${p} frame ${i} サイズ不正`);
			assert.ok(frame.delayMs > 0, `${p} frame ${i} delay が0以下`);
			let opaque = 0;
			for (let a = 3; a < frame.rgba.length; a += 4) if (frame.rgba[a] > 0) opaque++;
			if (opaque > 0) framesWithArt++;
			if (i === 0) assert.ok(opaque > 0, `${p} の1コマ目が真っ透明`);
		}
		assert.ok(framesWithArt >= 1, `${p} に絵のあるコマがない`);
	}
});

test('アニメの各コマは実際に絵が変化している(1コマ目と2コマ目が別物)', () => {
	const gif = parseGif(load('jiki/n.gif'));
	const [a, b] = [gif.frames[0].rgba, gif.frames[1].rgba];
	let diff = 0;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
	assert.ok(diff > 0, 'コマ間に差がない(デコードが壊れている可能性)');
});
