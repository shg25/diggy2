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
	// 目的は移動の検証なので、ボスの弾幕で死なないよう無敵化
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
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
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
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

test('ボスが登場して弾幕を撃ってくる', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	await page.waitForTimeout(2500); // GO!!(1秒) + counter 10tick でボス登場
	assert.equal(await step(), 12, 'ボス登場(COME)にならない');
	assert.ok(await page.evaluate(() => window.jibfreak.debug.boss !== null), 'ボスがいない');
	// ボスは画面外からゆっくり入場する。砲門が画面に入って弾幕が
	// 観測できるまで待つ(上限15秒。classicも入場中の弾は画面外で消える)
	let shots = 0;
	const deadline = Date.now() + 15000;
	while (shots === 0 && Date.now() < deadline) {
		await page.waitForTimeout(500);
		shots = await page.evaluate(() => window.jibfreak.debug.bossShotCount);
	}
	assert.ok(shots > 0, `弾幕が来ない: ${shots}`);
});

test('ボスを倒すと YOU WIN、5秒後にタイトルへ戻る(20年越しの初勝利)', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	await page.waitForTimeout(2500);
	assert.equal(await step(), 12, 'ボスが来ていない');

	// ボスを瀕死にして自機の射線上へ引きずり出し、正規の当たり判定で倒す
	await page.evaluate(() => {
		const boss = window.jibfreak.debug.boss;
		if (boss) {
			boss.life = 0.5;
			boss.x = 400;
			boss.y = window.jibfreak.debug.jiki.y - 20;
		}
	});
	await page.keyboard.press('Space');
	await page.waitForTimeout(500);
	assert.equal(await step(), 14, 'YOU WIN にならない');

	await page.waitForTimeout(5600);
	assert.equal(await step(), 0, 'タイトルに戻らない');
});

test('ステージ2: とぅと郎がいて、猫バスが暴れモードで周回する', async () => {
	// ステージ2を解放済みにして選択(解放の流れ自体は別テストで検証)
	await page.evaluate(() => localStorage.setItem('jibfreak.stage2', '1'));
	await page.reload({ waitUntil: 'load' });
	await page.waitForTimeout(1500);
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await page.keyboard.press('ArrowDown');
	await page.waitForTimeout(200);
	await startGame();
	await page.waitForTimeout(1500); // GO!! 明け(ステージ進行開始)

	// とぅと郎(1体)がいる
	assert.ok((await page.evaluate(() => window.jibfreak.debug.enemyCount)) >= 1, 'とぅと郎がいない');

	// ボス登場を待つ
	let s = await step();
	const comeDeadline = Date.now() + 8000;
	while (s !== 12 && Date.now() < comeDeadline) {
		await page.waitForTimeout(300);
		s = await step();
	}
	assert.equal(s, 12, '猫バスが来ない');

	// 瀕死にして暴れモードへ(life<=10 で発動)
	await page.evaluate(() => {
		const boss = window.jibfreak.debug.boss;
		if (boss) boss.life = 5;
	});
	await page.waitForTimeout(1000);
	assert.equal(await step(), 13, '暴れモード(BATTLE)に入らない');

	// 回転フェーズが巡る(0〜3のうち3種類以上を観測)
	const seen = new Set();
	const spinDeadline = Date.now() + 12000;
	while (seen.size < 4 && Date.now() < spinDeadline) {
		await page.waitForTimeout(300);
		const boss = await page.evaluate(() => window.jibfreak.debug.boss);
		if (boss) seen.add(boss.turnMode);
	}
	assert.ok(seen.size >= 3, `回転フェーズが巡らない: ${[...seen]}`);

	// 弾幕(直進弾 or 追尾弾)も出ている
	assert.ok(
		(await page.evaluate(() => window.jibfreak.debug.bossShotCount)) > 0,
		'2面の弾幕が来ない',
	);
});

test('スペース押しっぱなしで連射され、画面内は3発を超えない', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	await page.keyboard.down(' ');
	const samples = [];
	for (let i = 0; i < 8; i++) {
		await page.waitForTimeout(150);
		samples.push(await page.evaluate(() => window.jibfreak.debug.activeShots));
	}
	await page.keyboard.up(' ');
	assert.ok(Math.min(...samples) >= 1, `連射が途切れる: ${samples}`);
	assert.ok(Math.max(...samples) <= 3, `3発制限を超えた: ${samples}`);
});

test('ハイスコアが保存され、リロード後も残る', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	// スコアが入るまで撃つ
	let score = 0;
	const deadline = Date.now() + 15000;
	while (score === 0 && Date.now() < deadline) {
		await page.keyboard.press('Space');
		await page.waitForTimeout(150);
		score = await page.evaluate(() => window.jibfreak.debug.score);
	}
	assert.ok(score > 0, 'スコアが入らない');
	assert.ok(
		(await page.evaluate(() => window.jibfreak.debug.hiScore)) >= score,
		'ハイスコアが追従しない',
	);

	// リロードしても残っている(localStorage)
	await page.reload({ waitUntil: 'load' });
	await page.waitForTimeout(1500);
	const persisted = await page.evaluate(() => window.jibfreak.debug.hiScore);
	assert.ok(persisted >= score, `リロードでハイスコアが消えた: ${persisted}`);
});

test('P でポーズすると時間が止まり、P で即時再開する', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	await page.waitForTimeout(2000); // ステージ進行が動き出すのを待つ

	await page.keyboard.press('p');
	await page.waitForTimeout(200);
	assert.equal(await step(), 90, 'ポーズ状態(90)にならない');
	const c1 = await page.evaluate(() => window.jibfreak.debug.state.counter);
	await page.waitForTimeout(1000);
	const c2 = await page.evaluate(() => window.jibfreak.debug.state.counter);
	assert.equal(c2, c1, `ポーズ中にゲーム内時間が進んだ: ${c1} → ${c2}`);

	// ポーズ中は隠しコマンドも無効(スピード変更が効かない)
	const vel1 = await page.evaluate(() => window.jibfreak.debug.state.velJiki);
	await page.keyboard.press('s');
	await page.waitForTimeout(200);
	const vel2 = await page.evaluate(() => window.jibfreak.debug.state.velJiki);
	assert.equal(vel2, vel1, 'ポーズ中に隠しコマンドが効いた');

	// 画面全体(背景スクロール含む)がピクセル単位で静止している
	const shot1 = await page.screenshot();
	await page.waitForTimeout(600);
	const shot2 = await page.screenshot();
	assert.ok(shot1.equals(shot2), 'ポーズ中に画面のどこかが動いている(背景スクロール等)');

	await page.keyboard.press('p'); // 即時再開
	await page.waitForTimeout(500);
	const c3 = await page.evaluate(() => window.jibfreak.debug.state.counter);
	assert.ok(c3 > c2, `再開後に時間が進まない: ${c2} → ${c3}`);
	assert.notEqual(await step(), 90, '再開できていない');
});

test('ステージ2は最初ロックされていて、カーソルが動かない', async () => {
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.stage2Unlocked),
		false,
		'初期状態で解放されている',
	);
	await page.keyboard.press('ArrowDown');
	await page.waitForTimeout(200);
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.selectedStage),
		1,
		'ロック中なのにカーソルが動いた',
	);
});

test('ステージ1クリアでステージ2が解放され、リロード後も残る', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	await page.waitForTimeout(2500); // ボス登場待ち

	// ボスを正規の当たり判定で撃破(勝利テストと同じ手順)
	await page.evaluate(() => {
		const boss = window.jibfreak.debug.boss;
		if (boss) {
			boss.life = 0.5;
			boss.x = 400;
			boss.y = window.jibfreak.debug.jiki.y - 20;
		}
	});
	await page.keyboard.press('Space');
	await page.waitForTimeout(500);
	assert.equal(await step(), 14, '勝利していない');
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.stage2Unlocked),
		true,
		'クリアしたのに解放されない',
	);

	// タイトルへ戻ってステージ2を選んで開始できる
	await page.waitForTimeout(5600);
	await page.keyboard.press('ArrowDown');
	await page.waitForTimeout(200);
	assert.equal(await page.evaluate(() => window.jibfreak.debug.selectedStage), 2);
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.state.stageFlg),
		2,
		'ステージ2で始まらない',
	);

	// リロードしても解放は残る(localStorage)
	await page.reload({ waitUntil: 'load' });
	await page.waitForTimeout(1500);
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.stage2Unlocked),
		true,
		'リロードで解放が消えた',
	);
});

test('効果音: 既定はミュート、Mで切替、イベントで音が要求され、ポーズ中は増えない', async () => {
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.soundMuted),
		true,
		'既定が音ありになっている',
	);
	await page.keyboard.press('m');
	await page.waitForTimeout(200);
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.soundMuted),
		false,
		'Mでミュート解除できない',
	);

	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	const before = await page.evaluate(() => window.jibfreak.debug.soundRequests);
	await page.keyboard.press('Space'); // 射撃音が要求される
	await page.waitForTimeout(300);
	const after = await page.evaluate(() => window.jibfreak.debug.soundRequests);
	assert.ok(after > before, `射撃で音が要求されない: ${before} → ${after}`);

	// ポーズ中はゲームイベントが起きないので、音の要求も増えない
	await page.keyboard.press('p');
	await page.waitForTimeout(300);
	const paused1 = await page.evaluate(() => window.jibfreak.debug.soundRequests);
	await page.waitForTimeout(800);
	const paused2 = await page.evaluate(() => window.jibfreak.debug.soundRequests);
	assert.equal(paused2, paused1, 'ポーズ中に音が要求された');
});

// 論理座標(600x400)→ページ座標。viewport 800x600, scale=min(800/600,600/400)=1.333…
// canvas は 800x533 で縦中央寄せ(上余白 (600-533)/3? → 実測でなく計算: (600-533.33)/2=33.33)
function toClient(lx, ly) {
	const scale = Math.min(800 / 600, 600 / 400);
	const cw = 600 * scale;
	const ch = 400 * scale;
	return { x: (800 - cw) / 2 + lx * scale, y: (600 - ch) / 2 + ly * scale };
}

test('タッチ: ドラッグで自機が動き、触れている間は自動射撃される', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	const before = await page.evaluate(() => ({ ...window.jibfreak.debug.jiki }));

	// 画面中央下あたりに指を置いて右へドラッグしたまま保持
	const from = toClient(150, 350);
	const to = toClient(300, 350);
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	await page.mouse.move(to.x, to.y, { steps: 20 });
	await page.waitForTimeout(400); // 保持(自動射撃)
	const during = await page.evaluate(() => ({
		jiki: { ...window.jibfreak.debug.jiki },
		shots: window.jibfreak.debug.activeShots,
	}));
	await page.mouse.up();

	assert.ok(during.jiki.x > before.x + 100, `ドラッグで動かない: ${before.x} → ${during.jiki.x}`);
	assert.ok(during.shots > 0, 'タッチ保持で自動射撃されない');
});

test('タッチ: 画面上の♪ボタンで音を切替、⏸ボタンでポーズと再開', async () => {
	// ♪ボタン(タイトルでも効く)
	const snd = toClient(566 + 13, 26 + 10);
	await page.mouse.click(snd.x, snd.y);
	await page.waitForTimeout(200);
	assert.equal(
		await page.evaluate(() => window.jibfreak.debug.soundMuted),
		false,
		'♪ボタンでミュート解除できない',
	);

	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	const pse = toClient(534 + 13, 26 + 10);
	await page.mouse.click(pse.x, pse.y);
	await page.waitForTimeout(200);
	assert.equal(await step(), 90, '⏸ボタンでポーズしない');
	await page.mouse.click(pse.x, pse.y);
	await page.waitForTimeout(200);
	assert.notEqual(await step(), 90, '⏸ボタンで再開しない');
});

test('連射: ホールドは間隔が空き、弾同士が密着しない', async () => {
	await page.evaluate(() => {
		window.jibfreak.debug.state.muteki = true;
	});
	await startGame();
	await page.keyboard.down(' ');
	await page.waitForTimeout(230); // 即発射 + 0.15秒後の2発目まで
	const xs = await page.evaluate(() => window.jibfreak.debug.shotXs);
	await page.keyboard.up(' ');
	assert.ok(xs.length >= 2, `2発目が出ていない: ${xs}`);
	const gap = Math.abs(xs[0] - xs[1]);
	assert.ok(gap > 40, `弾が密着している(間隔${gap}px): ${xs}`);
});

test('canvasが論理解像度600x400で存在する', async () => {
	const size = await page.evaluate(() => {
		const c = document.querySelector('canvas');
		return c ? { w: c.width, h: c.height } : null;
	});
	assert.deepEqual(size, { w: 600, h: 400 });
});
