// JIB-FREAK MOBILE の回帰テスト。
// 接点は window.jibfreak.debug のみ (classic の window.ridge と同じ思想)。
import { test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 8766;
const GAME_URL = `http://localhost:${PORT}/jibfreak/index.html`;
const REPO_ROOT = new URL('../..', import.meta.url).pathname;

let server;
let browser;
let page;
let pageErrors;

before(async () => {
	server = spawn('python3', ['-m', 'http.server', String(PORT)], {
		cwd: REPO_ROOT,
		stdio: 'ignore',
	});
	for (let i = 0; i < 50; i++) {
		try {
			await fetch(GAME_URL);
			break;
		} catch {
			await new Promise((r) => setTimeout(r, 200));
		}
	}
	browser = await chromium.launch({ channel: 'chrome', headless: true });
});

after(async () => {
	await browser?.close();
	server?.kill();
});

beforeEach(async () => {
	page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
	pageErrors = [];
	page.on('pageerror', (e) => pageErrors.push(e.message));
	await page.goto(GAME_URL, { waitUntil: 'load' });
	await page.waitForTimeout(1500);
});

afterEach(async () => {
	assert.deepEqual(pageErrors, [], '実行時エラーが発生した');
	await page.context().close();
});

const step = () => page.evaluate(() => window.jibfreak.debug.stepFlg);

/** タイトルからゲーム開始(READY 2秒を待って START へ) */
async function startGame() {
	await page.keyboard.press('Space');
	await page.waitForTimeout(2300);
}

test('タイトル → READY → START と遷移する', async () => {
	assert.equal(await step(), 0, 'タイトルで始まらない');
	await page.keyboard.press('Space');
	await page.waitForTimeout(300);
	assert.equal(await step(), 10, 'READYに遷移しない');
	await page.waitForTimeout(2100);
	assert.equal(await step(), 11, 'STARTに遷移しない');
});

test('タップ(ポインタ)でも開始できる', async () => {
	await page.mouse.click(400, 300);
	await page.waitForTimeout(300);
	assert.equal(await step(), 10, 'タップでREADYに遷移しない');
});

test('矢印キーで自機が動き、画面端で止まる', async () => {
	await startGame();
	const before = await page.evaluate(() => ({ ...window.jibfreak.debug.jiki }));

	await page.keyboard.down('ArrowRight');
	await page.waitForTimeout(400);
	await page.keyboard.up('ArrowRight');
	const after = await page.evaluate(() => ({ ...window.jibfreak.debug.jiki }));
	assert.ok(after.x > before.x, `右に動いていない: ${before.x} → ${after.x}`);

	// 右端まで押し続けても画面外に出ない
	await page.keyboard.down('ArrowRight');
	await page.waitForTimeout(3000);
	await page.keyboard.up('ArrowRight');
	const edge = await page.evaluate(() => ({ ...window.jibfreak.debug.jiki }));
	assert.equal(edge.x, 600 - 32, `右端で止まらない: ${edge.x}`);
});

test('スペースで撃てる。ショット切替(Z)後は同時弾数が変わる', async () => {
	await startGame();
	await page.keyboard.press('Space');
	await page.waitForTimeout(100);
	const n1 = await page.evaluate(() => window.jibfreak.debug.activeShots);
	assert.ok(n1 >= 1, `弾が出ていない: ${n1}`);

	// レーザー(3方向)へ切替: Z を2回(1→2→3)。
	// 同一フレーム内の2連打は1回に潰れるため、押下の間隔を空ける
	await page.waitForTimeout(1000); // 弾が抜けるのを待つ
	await page.keyboard.press('z');
	await page.waitForTimeout(100);
	await page.keyboard.press('z');
	await page.waitForTimeout(100);
	await page.keyboard.press('Space');
	await page.waitForTimeout(100);
	const n3 = await page.evaluate(() => window.jibfreak.debug.activeShots);
	assert.ok(n3 >= 3, `レーザーが3方向出ていない: ${n3}`);
});

test('敵が湧いてくる', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	await page.waitForTimeout(3000);
	const n = await page.evaluate(() => window.jibfreak.debug.enemyCount);
	assert.ok(n > 0, `敵がいない: ${n}`);
	const numTeki = await page.evaluate(() => window.jibfreak.debug.state.numTeki);
	assert.ok(Number.isInteger(numTeki) && numTeki >= 0, `numTeki異常: ${numTeki}`);
});

test('敵を撃つとスコアが入る', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	// スコアが入るまで撃ち続ける(上限15秒)
	let score = 0;
	const deadline = Date.now() + 15000;
	while (score === 0 && Date.now() < deadline) {
		await page.keyboard.press('Space');
		await page.waitForTimeout(150);
		score = await page.evaluate(() => window.jibfreak.debug.score);
	}
	assert.ok(score > 0, `スコアが入らない: ${score}`);
});

test('敵に当たると GAME OVER になり、タイトルへ戻る', async () => {
	await startGame();
	// 無敵なしで待てば、いずれ敵が当たる(上限20秒)
	let step = 11;
	const deadline = Date.now() + 20000;
	while (step !== 19 && Date.now() < deadline) {
		await page.waitForTimeout(300);
		step = await page.evaluate(() => window.jibfreak.debug.stepFlg);
	}
	assert.equal(step, 19, 'GAME OVERにならない');
	await page.waitForTimeout(3500);
	assert.equal(await page.evaluate(() => window.jibfreak.debug.stepFlg), 0, 'タイトルに戻らない');
});

test('ボム(B)で画面の敵がまとめて消えてスコアが入る', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	// 敵が2体以上になるまで待つ(上限15秒)
	let enemies = 0;
	const deadline = Date.now() + 15000;
	while (enemies < 2 && Date.now() < deadline) {
		await page.waitForTimeout(300);
		enemies = await page.evaluate(() => window.jibfreak.debug.enemyCount);
	}
	assert.ok(enemies >= 2, `敵が揃わない: ${enemies}`);

	await page.keyboard.press('b');
	await page.waitForTimeout(1000); // ボム窓600ms + やられ演出
	const score = await page.evaluate(() => window.jibfreak.debug.score);
	assert.ok(score > 0, `ボムでスコアが入らない: ${score}`);
});

test('アイテムが流れてくる(そして敵数を狂わせない)', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	// 平均6秒に1個湧く(毎tick 1/180)。上限45秒待つ
	let pwrs = 0;
	const deadline = Date.now() + 45000;
	while (pwrs === 0 && Date.now() < deadline) {
		await page.waitForTimeout(500);
		pwrs = await page.evaluate(() => window.jibfreak.debug.pwrCount);
	}
	assert.ok(pwrs > 0, 'アイテムが一度も湧かない');
	const numTeki = await page.evaluate(() => window.jibfreak.debug.state.numTeki);
	const enemies = await page.evaluate(() => window.jibfreak.debug.enemyCount);
	assert.equal(numTeki, enemies, `numTeki(${numTeki})と実数(${enemies})がズレている`);
});

test('canvasが論理解像度600x400で存在する', async () => {
	const size = await page.evaluate(() => {
		const c = document.querySelector('canvas');
		return c ? { w: c.width, h: c.height } : null;
	});
	assert.deepEqual(size, { w: 600, h: 400 });
});
