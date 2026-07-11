import { BAN_DURATION_MS, BOMB_DURATION_MS } from './const.js';
import { state } from './state.js';
import { setTxtScore } from './text.js';
import { STEP_COME, STEP_BATTLE, stepFlg, isFight, transitions } from './flow.js';

/** @type {DGESprite} */ export let logo;

/** @type {DGESprite} */ export let jiki;

// 自機ショット 1:シングル 2:ダブル 3:レーザー
/** @type {DGESprite[]} */ export const jikiSh1 = [];
/** @type {DGESprite[]} */ export const jikiSh2 = [];
/** @type {DGESprite[]} */ export const jikiSh3 = [];
export const numJikiSh1 = 3;
export const numJikiSh2 = 3;
export const numJikiSh3 = 3;

// 自機ショット定義 [0]:前 [1]:後 [2]:レーザー
const JIKI_SH_DEFS = [
	{ image: 'gfx/jiki/s1.gif', width: 8, height: 8, velocity: 16, angle: 180 },
	{ image: 'gfx/jiki/s1.gif', width: 8, height: 8, velocity: 16, angle: 0 },
	{ image: 'gfx/jiki/s3.gif', width: 16, height: 8, velocity: 6, angle: 180 },
];

const groupTeki = 'groupTeki';
/** @type {DGESprite} */ export let teki2; // 2面の敵(とぅと郎)。1体だけなので使い回す

const groupPwr = 'groupPwr';

/** @type {DGESprite} */ export let boss;
export const groupBossSh = 'groupBossSh';

// 2面ボスの暴れ状態(フレームをまたいで持ち越すのでファイルレベル)
/** @type {'r' | 'l' | undefined} 回転方向 */
let bossTurn;
/** @type {number} 回転フェーズ(0〜3) */
export let bossTurnMode; // 検証スクリプトが読むため公開
// 2面ボス追尾弾の状態(本当は弾ごとに持つべきだが、当時の挙動を維持)
/** @type {'on' | 'off' | undefined} 追尾発動状態 */
let turn;

// --------------------------------------------------

export function newSpriteBg() {
	new DGE.Sprite({
		image: 'gfx/bg.gif',
		width: 1920,
		height: 320,
		x: 0,
		y: DGE.stage.height - 320,
		z: 1,
		velocity: 2,
		angle: 0,
	})
		.on('ping', function () {
			if (this.x <= -960) {
				this.set('x', 0);
			}
		})
		.start();
}

// --------------------------------------------------

export function newSpriteLogo() {
	logo = new DGE.Sprite({
		image: 'gfx/title/logo.gif',
		width: 320,
		height: 160,
		x: 140,
		y: 40,
		z: 1,
	});
}

export function newSpriteJiki() {
	jiki = new DGE.Sprite({
		image: 'gfx/jiki/n.gif',
		width: 32,
		height: 32,
		x: DGE.stage.width / 2 - 16,
		y: DGE.stage.height / 2 - 16,
		z: 2,
	});
}

export function removeJiki() {
	jiki.set('image', 'gfx/ban.gif');
	setTimeout(function () {
		jiki.remove();
	}, BAN_DURATION_MS);
}

/**
 * @param {DGESprite[]} shots 追加先のプール
 * @param {number} num 作る数
 * @param {{ image: string, width: number, height: number, velocity: number, angle: number }} def
 */
function pushJikiShots(shots, num, def) {
	for (let i = 0; i < num; i++) {
		shots.push(
			new DGE.Sprite({
				image: def.image,
				width: def.width,
				height: def.height,
				velocity: def.velocity,
				angle: def.angle,
			})
				.on('ping', function () {
					if (this.isOutOfBounds(true)) this.hide().stop();
				})
				.hide(),
		);
	}
}

export function defineJikiSh() {
	// ショットは使い回すプールなので、作るのは初回だけ。
	// 毎ゲーム作り直すと、使われないスプライトが9個ずつ積もっていく
	if (jikiSh1.length > 0) return;
	pushJikiShots(jikiSh1, numJikiSh1, JIKI_SH_DEFS[0]);
	pushJikiShots(jikiSh2, numJikiSh2, JIKI_SH_DEFS[1]);
	pushJikiShots(jikiSh3, numJikiSh3, JIKI_SH_DEFS[2]);
}

// --------------------

// ボス定義 [0]:1面 [1]:2面(猫バス)
const BOSS_DEFS = [
	{ width: 278, height: 65, x: -277, y: 300, velocity: 1, angle: 170 },
	{ width: 222, height: 120, x: 599, y: 270, velocity: 10, angle: 0 },
];

export function newSpriteBoss() {
	let n;
	if (state.stageFlg !== 1) n = 1;
	else n = 0;
	const def = BOSS_DEFS[n];

	boss = new DGE.Sprite({
		image: 'gfx/teki/' + (n + 60) + '/l.gif',
		width: def.width,
		height: def.height,
		x: def.x,
		y: def.y,
		z: 2,
		velocity: def.velocity,
		angle: def.angle,
		life: 20,
		score: 5000,
		n: n,
		tag: 'boss',
	})
		.on('ping', function () {
			if (!this.get('active')) return;
			// 後方ショット(jikiSh2)はボスに当たらない仕様
			hitJikiSh(this, 0, numJikiSh1, jikiSh1, 1);
			hitJikiSh(this, 1, numJikiSh3, jikiSh3, 0.2);
			touchJiki(this);

			if (state.stageFlg !== 1) {
				// 2面のボスの動き
				if (stepFlg === STEP_COME) {
					if (this.x <= -222) {
						this.set('image', 'gfx/teki/61/r.gif');
						this.set('angle', 180);
					}
					if (this.x >= 600) {
						this.set('image', 'gfx/teki/61/l.gif');
						this.set('angle', 0);
					}

					// 暴れます
					if (this.get('life') <= 10) {
						if (this.get('angle') === 180) {
							bossTurn = 'r';
						} else if (this.get('angle') === 0) {
							bossTurn = 'l';
						}
						bossTurnMode = 0;
						transitions.battle();
					}
				} // STEP_COME

				if (stepFlg === STEP_BATTLE) {
					// 暴れる
					if (bossTurn === 'r') {
						// 反時計回り
						if (this.x >= 600) {
							this.set('image', 'gfx/teki/61/l.gif');
							this.set('angle', 0);
							bossTurn = 'l';
						}
					}
					if (bossTurn === 'l') {
						// 時計回り
						if (bossTurnMode === 0 && this.x <= 0) {
							this.set('angle', 90);
							this.set('width', 120);
							this.set('height', 222);
							this.set('image', 'gfx/teki/61/l_1.gif');
							bossTurnMode = 1;
						}
						if (bossTurnMode === 1 && this.y <= 0) {
							this.set('angle', 180);
							this.set('width', 222);
							this.set('height', 120);
							this.set('image', 'gfx/teki/61/l_2.gif');
							bossTurnMode = 2;
						}
						if (bossTurnMode === 2 && this.x >= 400) {
							this.set('angle', 270);
							this.set('width', 120);
							this.set('height', 222);
							this.set('x', 480);
							this.set('image', 'gfx/teki/61/l_3.gif');
							bossTurnMode = 3;
						}
						if (bossTurnMode === 3 && this.y >= 178) {
							this.set('angle', 0);
							this.set('width', 222);
							this.set('height', 120);
							this.set('y', 270);
							this.set('image', 'gfx/teki/61/l.gif');
							bossTurnMode = 0;
						}
					}
				}
			} else {
				// 1面のボスの動き
				if (this.isOutOfBounds(true)) {
					this.remove();
					return;
				}
				if (stepFlg === STEP_COME && this.x >= 310) {
					// 後進
					this.set('angle', 90);
					transitions.battle();
				}
				if (stepFlg === STEP_BATTLE) {
					// 上下移動
					if (this.y <= 50) this.set('angle', 270);
					if (this.y >= 300) this.set('angle', 90);
				}
			}
		})
		.start();
}

export function getoutBoss() {
	if (state.stageFlg !== 1) return;
	if (boss.get('active')) boss.set('angle', 20);
}

// --------------------

// とぅと郎
export function newSpriteTeki2() {
	teki2 = new DGE.Sprite({
		image: 'gfx/teki/20/l.gif',
		width: 32,
		height: 32,
		x: 599,
		y: 200,
		z: 2,
		velocity: 5,
		angle: 0,
		life: 90,
		score: 5000,
		n: 20,
		group: groupTeki,
		turn: 'up',
	})
		.on('ping', function () {
			if (!this.get('active')) return;
			if (this.isOutOfBounds(true)) {
				state.numTeki--;
				this.remove();
				return;
			}
			hitAllJikiSh(this, 0.8);
			touchJiki(this);
		})
		.start();
}

export function moveTeki2() {
	if (teki2.get('angle') >= 80) teki2.set('turn', 'down');
	else if (teki2.get('angle') <= -80) teki2.set('turn', 'up');

	if (teki2.get('turn') === 'up') teki2.set('angle', teki2.get('angle') + 5);
	else if (teki2.get('turn') === 'down') teki2.set('angle', teki2.get('angle') - 5);

	if (teki2.get('x') >= 500) {
		teki2.set('velocity', 5);
		teki2.set('image', 'gfx/teki/20/l.gif');
	} else if (teki2.get('x') <= 100) {
		teki2.set('velocity', -5);
		teki2.set('image', 'gfx/teki/20/r.gif');
	}
}

// --------------------------------------------------

//2面のボス弾 [0]:直進弾 [1]:追尾弾
const BOSS_SH2_DEFS = [{ velocity: 10 }, { velocity: 5 }];

/** @param {number} num 弾種([0]:直進 [1]:追尾) */
export function newSpriteBossSh2(num) {
	const def = BOSS_SH2_DEFS[num];
	const wBossSh = 16;
	const hBossSh = 16;
	const xBossSh = 60;
	const yBossSh = 60;
	const angBossSh =
		(Math.atan2((jiki.get('y') - boss.get('y')) * -1, (jiki.get('x') - boss.get('x')) * -1) * 180) /
		Math.PI;

	new DGE.Sprite({
		image: 'gfx/teki/61/s' + num + '.gif',
		width: wBossSh,
		height: hBossSh,
		x: boss.x + xBossSh,
		y: boss.y + yBossSh,
		z: 2,
		velocity: def.velocity,
		angle: angBossSh,
		life: 20,
		n: num,
		group: groupBossSh,
	})
		.on('ping', function () {
			if (!this.get('active')) return;
			if (this.isOutOfBounds(true)) {
				this.remove();
				return;
			}
			if (this.get('active') && this.get('n') === 1 && this.get('life') >= 0) {
				this.set('life', this.get('life') - 1);
				turn = 'on';
				return;
			}
			if (this.get('life') <= 0 && turn === 'on') {
				this.set(
					'angle',
					(Math.atan2((jiki.get('y') - this.get('y')) * -1, (jiki.get('x') - this.get('x')) * -1) *
						180) /
						Math.PI,
				);
				this.set('velocity', this.get('velocity') * 3);
				turn = 'off';
				return;
			}
			touchJiki(this);
		})
		.start();
}

//--------------------------------------------------

//パワーアップアイテム [0]:ショット変更 [1]:スピード変更 [2]:ボム
const PWR_DEFS = [
	{ width: 24, height: 16, velocity: 5 },
	{ width: 16, height: 24, velocity: 5 },
	{ width: 16, height: 17, velocity: 10 },
];

export function makePwr() {
	const n = Math.floor(Math.random() * PWR_DEFS.length);
	const def = PWR_DEFS[n];
	let velocity = def.velocity;
	const lr = Math.floor(Math.random() * 2);
	let xTeki;
	if (lr === 0) {
		xTeki = DGE.stage.width;
	} else {
		xTeki = -16;
		velocity = velocity * -0.4;
	}

	new DGE.Sprite({
		image: 'gfx/teki/' + (n + 80) + '/l.gif',
		width: def.width,
		height: def.height,
		x: xTeki,
		y: DGE.rand(jiki.height, DGE.stage.height - 100),
		z: 2,
		velocity: velocity,
		n: n,
		group: groupPwr,
	})
		.on('ping', function () {
			if (!this.get('active')) return;
			if (this.isOutOfBounds(true)) {
				this.remove(); // アイテムは敵数(numTeki)に入っていないので減らさない
				return;
			}
			touchJiki(this);
		})
		.start();
}

// --------------------------------------------------
// 1面の雑魚敵定義 (angRange: 進行角のブレ幅。角度は ±angRange/2 の範囲でランダム)
const TEKI1_DEFS = [
	{ width: 16, height: 16, velocity: 5, life: 2, score: 50, angRange: 30 },
	{ width: 16, height: 16, velocity: 10, life: 4, score: 1000, angRange: 0 },
	{ width: 16, height: 16, velocity: 3, life: 3, score: 100, angRange: 160 },
	{ width: 16, height: 16, velocity: 8, life: 2, score: 250, angRange: 90 },
];

// 1面の敵機作る
export function makeTeki1() {
	const n = Math.floor(Math.random() * TEKI1_DEFS.length);
	const def = TEKI1_DEFS[n];
	let velocity = def.velocity;
	const angle = Math.floor(Math.random() * def.angRange) - def.angRange / 2;
	const lr = Math.floor(Math.random() * 2);
	let lrTeki;
	let xTeki;
	if (lr === 0) {
		lrTeki = 'l';
		xTeki = DGE.stage.width;
	} else {
		lrTeki = 'r';
		xTeki = -16;
		velocity = velocity * -0.4;
	}

	new DGE.Sprite({
		image: 'gfx/teki/' + n + '/' + lrTeki + '.gif',
		width: def.width,
		height: def.height,
		x: xTeki,
		y: DGE.rand(jiki.height, DGE.stage.height - 100),
		z: 2,
		velocity: velocity,
		angle: angle,
		life: def.life,
		score: def.score,
		n: n,
		group: groupTeki,
	})
		.on('ping', function () {
			if (!this.get('active')) return;
			if (this.isOutOfBounds(true)) {
				state.numTeki--;
				this.remove();
				return;
			}
			if (state.bombTeki === 1) banSprite(this);
			hitAllJikiSh(this, 0.8);
			touchJiki(this);

			// 上下端で角度速度を鋭利に
			if (this.y >= 352 || this.y <= 16) {
				this.set('angle', this.get('angle') * -0.7);
				this.set('velocity', this.get('velocity') * 1.3);
				return;
			}
		})
		.start();
}

// 雑魚敵と自機全ショットの当たり判定(レーザーだけ貫通するのでダメージ倍率が別)
/**
 * @param {DGESprite} sprite
 * @param {number} laserDamage レーザーのダメージ倍率
 */
function hitAllJikiSh(sprite, laserDamage) {
	hitJikiSh(sprite, 0, numJikiSh1, jikiSh1, 1);
	hitJikiSh(sprite, 0, numJikiSh2, jikiSh2, 1);
	hitJikiSh(sprite, 1, numJikiSh3, jikiSh3, laserDamage);
}

/**
 * @param {DGESprite} sprite 当たられる側(敵)
 * @param {number} type 1ならレーザー(貫通して消えない)
 * @param {number} num プール内の弾数
 * @param {DGESprite[]} jikiSh 弾のプール
 * @param {number} damage
 */
function hitJikiSh(sprite, type, num, jikiSh, damage) {
	for (let i = 0; i < num; i++) {
		if (jikiSh[i].get('active') && sprite.isTouching(jikiSh[i])) {
			sprite.set('life', sprite.get('life') - damage);
			if (type === 1) {
				// レーザー
			} else {
				jikiSh[i].hide().stop();
			}
			if (sprite.get('life') <= 0) banSprite(sprite);
			return;
		}
	}
}

/** @param {DGESprite} sprite */
function banSprite(sprite) {
	if (sprite.get('tag') !== 'boss') {
		// BOSSのときはスルー
		state.numTeki--;
	}
	setTxtScore(sprite.get('score'));
	sprite.stop();
	sprite.set('image', 'gfx/ban.gif');
	setTimeout(function () {
		sprite.remove();
	}, BAN_DURATION_MS);
}

/** @param {DGESprite} sprite */
function touchJiki(sprite) {
	if (state.muteki) return; // デバッグ用無敵
	if (!sprite.isTouching(jiki)) return;
	if (!isFight()) return;
	if (sprite.get('group') === groupPwr) {
		sprite.remove();
		if (sprite.get('n') === 0) chJikiSh();
		else if (sprite.get('n') === 1) chVelJiki();
		else rmGroupTeki();
	} else {
		transitions.lose();
	}
}

// --------------------------------------------------
// パワーアップ効果(アイテム取得と隠しコマンドの両方から使われる)

// ショット変更
export function chJikiSh() {
	if (state.jikiShFlg !== 3) state.jikiShFlg += 1;
	else state.jikiShFlg = 0;
}

// スピード変更
export function chVelJiki() {
	if (state.velJiki === 5) state.velJiki = 10;
	else if (state.velJiki === 10) state.velJiki = 30;
	else if (state.velJiki === 30) state.velJiki = 1;
	else if (state.velJiki === 1) state.velJiki = 5;
}

// ボム
export function rmGroupTeki() {
	if (boss.get('active')) {
		DGE.Sprite.execByProperty('group', groupBossSh, 'remove');
	}
	state.bombTeki = 1;
	setTimeout(function () {
		state.bombTeki = 0;
	}, BOMB_DURATION_MS);
}

// --------------------------------------------------
// 1面のボス弾
/** @param {number} num 発射カウント(角度と発射口が交互に変わる) */
export function makeBossSh1(num) {
	const velBossSh = 2;
	const wBossSh = 4;
	const hBossSh = 4;

	let angBossSh;
	let xBossSh;
	let yBossSh;
	if (num % 2 === 0) {
		angBossSh = num * 10;
		xBossSh = 65;
		yBossSh = 55;
	} else {
		angBossSh = num * -10;
		xBossSh = 205;
		yBossSh = 35;
	}

	new DGE.Sprite({
		image: 'gfx/teki/60/s1.gif',
		width: wBossSh,
		height: hBossSh,
		x: boss.x + xBossSh,
		y: boss.y + yBossSh,
		z: 2,
		velocity: velBossSh,
		angle: angBossSh,
		group: groupBossSh,
	})
		.on('ping', function () {
			if (!this.get('active')) return;
			if (this.isOutOfBounds(true)) {
				this.remove();
				return;
			}
			touchJiki(this);
		})
		.start();

	if (num % 30 === 0 && stepFlg === STEP_BATTLE) {
		new DGE.Sprite({
			image: 'gfx/teki/60/s2.gif',
			width: 128,
			height: 2,
			x: boss.x - 120,
			y: boss.y + 45,
			z: 2,
			velocity: 4,
			angle: 10,
			group: groupBossSh,
		})
			.on('ping', function () {
				if (!this.get('active')) return;
				if (this.isOutOfBounds(true)) {
					this.remove();
					return;
				}
				touchJiki(this);
			})
			.start();
	}
}

// --------------------------------------------------

export function resetSprite() {
	state.counter = 0;
	state.velJiki = 5;
	state.jikiShFlg = 1;
	state.numTeki = 0;

	DGE.Sprite.execByProperty('group', groupPwr, 'remove');
	DGE.Sprite.execByProperty('group', groupTeki, 'remove');
	if (boss.get('active')) {
		DGE.Sprite.execByProperty('group', groupBossSh, 'remove');
		boss.remove();
	}
}
