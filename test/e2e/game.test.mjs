// 実ゲームをヘッドレスChromeで遊ばせる回帰テスト。
// リファクタリング期間中に毎回手で回していた検証スクリプト(通称drive)を
// リポジトリの資産として正式採用したもの。
// 実行: npm run test:e2e (Google Chrome が必要)
//
// ゲーム側との接点は window.ridge.debug (js/ridge.js で定義) のみ。
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 8765;
const GAME_URL = `http://localhost:${PORT}/index.html`;
const REPO_ROOT = new URL('../..', import.meta.url).pathname;

let server;
let browser;
let page;
let pageErrors;

before(async () => {
	// 静的サーバーを起動してポートが開くまで待つ
	server = spawn('python3', ['-m', 'http.server', String(PORT)], {
		cwd : REPO_ROOT, stdio : 'ignore'
	});
	for (let i = 0; i < 50; i++) {
		try {
			await fetch(GAME_URL);
			break;
		} catch {
			await new Promise(r => setTimeout(r, 200));
		}
	}
	browser = await chromium.launch({ channel : 'chrome', headless : true });
});

after(async () => {
	await browser?.close();
	server?.kill();
});

beforeEach(async () => {
	page = await (await browser.newContext({ viewport : { width : 800, height : 600 } })).newPage();
	pageErrors = [];
	page.on('pageerror', e => pageErrors.push(e.message));
	await page.goto(GAME_URL, { waitUntil : 'load' });
	await page.waitForTimeout(1500);
});

afterEach(async () => {
	assert.deepEqual(pageErrors, [], '実行時エラーが発生した');
	await page.context().close();
});

// タイトルからゲームを開始し、無敵化して操作可能な状態にする
async function startInvincible(stage2 = false) {
	if (stage2) {
		await page.keyboard.press('s');
		await page.waitForTimeout(300);
	}
	await page.keyboard.press('Space');
	await page.waitForTimeout(2100); // READY 2秒
	await page.evaluate(() => { window.ridge.debug.state.muteki = true; });
}

const debug = (fn) => page.evaluate(fn);

test('1面: 撃破でスコアが入り、勝利でタイトルへ戻る', async () => {
	await startInvincible();

	// 連射して雑魚を撃つ + 隠しコマンド(ショット切替・ボム)
	for (let i = 0; i < 20; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(120); }
	await page.keyboard.press('z');
	for (let i = 0; i < 8; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(120); }
	await page.keyboard.press('b');

	// 全種の敵とアイテムを強制湧きさせて全コードパスを踏む
	// makeTeki1 は生成のみでカウントは呼び出し側(stage.js)の責務なので、ここでも同じ契約に従う
	await debug(() => { for (let i = 0; i < 20; i++) { ridge.debug.state.numTeki++; ridge.debug.makeTeki1(); } });
	await debug(() => { for (let i = 0; i < 5; i++) ridge.debug.makePwr(); });
	await page.waitForTimeout(2000);

	const st = await debug(() => ({
		score : ridge.debug.score,
		bossActive : ridge.debug.boss && ridge.debug.boss.get('active'),
		numTeki : ridge.debug.state.numTeki
	}));
	assert.ok(st.score > 0, `スコアが入っていない: ${st.score}`);
	assert.ok(st.bossActive, 'ボスが出現していない');
	assert.ok(Number.isInteger(st.numTeki) && st.numTeki >= 0, `numTeki異常: ${st.numTeki}`);

	// 勝利 → タイトル復帰
	await debug(() => { ridge.debug.goWin(); });
	await page.waitForTimeout(5800);
	assert.equal(await debug(() => ridge.debug.stepFlg), 0, 'タイトルに戻っていない');
});

test('2面: ボスが暴れモードで画面を周回し、敗北でタイトルへ戻る', async () => {
	await startInvincible(true);
	await page.waitForTimeout(2500); // goCome まで

	assert.ok(await debug(() => ridge.debug.boss && ridge.debug.boss.get('active')), 'ボス未出現');

	// 追尾弾のコードパス + 暴れモード強制(life<=10)
	await debug(() => { ridge.debug.newSpriteBossSh2(1); });
	await page.waitForTimeout(1500);
	await debug(() => { ridge.debug.boss.set('life', 5); });
	await page.waitForTimeout(1000);
	assert.equal(await debug(() => ridge.debug.stepFlg), 13, '暴れモード(BATTLE)に入っていない');

	// 回転フェーズ(bossTurnMode 0→1→2→3)が一周することを観察
	const seen = new Set();
	for (let i = 0; i < 16; i++) {
		await page.waitForTimeout(700);
		seen.add(await debug(() => ridge.debug.bossTurnMode));
	}
	assert.deepEqual([...seen].sort(), [0, 1, 2, 3], `回転フェーズが揃わない: ${[...seen]}`);

	// 敗北 → タイトル復帰
	await debug(() => { ridge.debug.goLose(); });
	await page.waitForTimeout(3800);
	assert.equal(await debug(() => ridge.debug.stepFlg), 0, 'タイトルに戻っていない');
});

test('敵数カウンタは初回プレイから0以上の整数で推移する', async () => {
	await startInvincible();
	await debug(() => { for (let i = 0; i < 6; i++) ridge.debug.makePwr(); });

	const samples = [];
	for (let t = 0; t < 20; t++) {
		await page.keyboard.press('Space');
		await page.waitForTimeout(400);
		samples.push(await debug(() => ridge.debug.state.numTeki));
	}
	const bad = samples.filter(v => !Number.isInteger(v) || v < 0);
	assert.deepEqual(bad, [], `異常値: ${bad}`);
	assert.ok(samples.some(v => v > 0), '敵が一度も湧いていない');
});

test('3回プレイしてもスプライトプールとDOMが増えない(リーク検知)', async () => {
	const snapshot = () => debug(() => ({
		pools : ridge.debug.poolSizes,
		dom : document.getElementById('screen').children.length
	}));

	const results = [];
	for (let game = 1; game <= 3; game++) {
		await page.keyboard.press('Space');
		await page.waitForTimeout(3200); // READY + GO
		for (let i = 0; i < 5; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(150); }
		await debug(() => { if (ridge.debug.isPlay()) ridge.debug.goLose(); });
		await page.waitForTimeout(3800);
		results.push(await snapshot());
	}
	assert.deepEqual(results[2].pools, results[0].pools, `プールが成長: ${JSON.stringify(results)}`);
	assert.equal(results[2].dom, results[0].dom, `DOMが成長: ${JSON.stringify(results)}`);
});
