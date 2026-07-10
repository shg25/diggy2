'use strict';

var bg;
var logo;

var jiki;
var velJiki = 5;

// 自機ショット 1:シングル 2:ダブル 3:レーザー
var jikiShFlg = 1;
var jikiSh1 = [];
var jikiSh2 = [];
var jikiSh3 = [];
var numJikiSh1 = 3;
var numJikiSh2 = 3;
var numJikiSh3 = 3;

// 自機ショット定義 [0]:前 [1]:後 [2]:レーザー
var JIKI_SH_DEFS = [
	{ image : 'gfx/jiki/s1.gif', width : 8,  height : 8, velocity : 16, angle : 180 },
	{ image : 'gfx/jiki/s1.gif', width : 8,  height : 8, velocity : 16, angle : 0 },
	{ image : 'gfx/jiki/s3.gif', width : 16, height : 8, velocity : 6,  angle : 180 }
];

var groupTeki = 'groupTeki';
var numTeki = 0; // 1面の雑魚敵の数(湧きで++、画面外/撃破で--)
var teki2; // 2面の敵(とぅと郎)。1体だけなので使い回す

var groupPwr = 'groupPwr';
var bombTeki;

var boss;
var groupBossSh = 'groupBossSh';

// 2面ボスの暴れ状態(フレームをまたいで持ち越すのでファイルレベル)
var bossTurn;
var bossTurnMode;
// 2面ボス追尾弾の状態(本当は弾ごとに持つべきだが、当時の挙動を維持)
var turn;

// --------------------------------------------------

function newSpriteBg() {
	bg = new DGE.Sprite({
		image : 'gfx/bg.gif', width : 1920, height : 320, 
		x : 0, y : DGE.stage.height - 320, z : 1,
		velocity : 2, angle : 0
	})
	.on('ping', function() {
		if (this.x <= -960) {
			this.set('x', 0);
		}
	})
	.start();
}

// --------------------------------------------------

function newSpriteLogo() {
	logo = new DGE.Sprite({
		image : 'gfx/title/logo.gif', width : 320, height : 160,
		x : 140, y : 40, z : 1
	});
}

function newSpriteJiki() {
	jiki = new DGE.Sprite({
		image : 'gfx/jiki/n.gif', width : 32, height : 32,
		x : DGE.stage.width / 2 - 16, y : DGE.stage.height / 2 - 16, z : 2
	});
}

function removeJiki() {
	jiki.set('image', 'gfx/ban.gif');
	setTimeout(function() {
		jiki.remove();
	}, BAN_DURATION_MS);
}

function pushJikiShots(shots, num, def) {
	for (var i = 0; i < num; i++) {
		shots.push(new DGE.Sprite({
			image : def.image, width : def.width, height : def.height,
			velocity : def.velocity, angle : def.angle
		})
		.on('ping', function() {
			if (this.isOutOfBounds(true)) this.hide().stop();
		})
		.hide());
	}
}

function defineJikiSh() {
	// ショットは使い回すプールなので、作るのは初回だけ。
	// 毎ゲーム作り直すと、使われないスプライトが9個ずつ積もっていく
	if (jikiSh1.length > 0) return;
	pushJikiShots(jikiSh1, numJikiSh1, JIKI_SH_DEFS[0]);
	pushJikiShots(jikiSh2, numJikiSh2, JIKI_SH_DEFS[1]);
	pushJikiShots(jikiSh3, numJikiSh3, JIKI_SH_DEFS[2]);
}

// --------------------

// ボス定義 [0]:1面 [1]:2面(猫バス)
var BOSS_DEFS = [
	{ width : 278, height : 65,  x : -277, y : 300, velocity : 1,  angle : 170 },
	{ width : 222, height : 120, x : 599,  y : 270, velocity : 10, angle : 0 }
];

function newSpriteBoss() {
	var n;
	if (stageFlg !== 1) n = 1;
	else n = 0;
	var def = BOSS_DEFS[n];

	boss = new DGE.Sprite({
		image : 'gfx/teki/' + (n + 60) + '/l.gif', width : def.width, height : def.height,
		x : def.x, y : def.y, z : 2,
		velocity : def.velocity, angle : def.angle,
		life : 20, score : 5000,
		n : n, tag : 'boss'
	})
	.on('ping', function() {
		if (!this.get('active')) return;
		// 後方ショット(jikiSh2)はボスに当たらない仕様
		hitJikiSh(this, 0, numJikiSh1, jikiSh1, 1);
		hitJikiSh(this, 1, numJikiSh3, jikiSh3, 0.2);
		touchJiki(this);
		
		if (stageFlg !== 1) { // 2面のボスの動き
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
						bossTurn = "r";
					} else if (this.get('angle') === 0) {
						bossTurn = "l";
					}
					bossTurnMode = 0;
					goBattle();
				}
			} // STEP_COME
			
			if (stepFlg === STEP_BATTLE) { // 暴れる
				if (bossTurn === "r") { // 反時計回り
					if (this.x >= 600) {
						this.set('image', 'gfx/teki/61/l.gif');
						this.set('angle', 0);
						bossTurn = "l";
					}
				}
				if (bossTurn === "l") { // 時計回り
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
						this.set('image','gfx/teki/61/l_3.gif');
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
		} else { // 1面のボスの動き
			if (this.isOutOfBounds(true)) {
				this.remove();
				return;
			}
			if (stepFlg === STEP_COME && this.x >= 310) { // 後進
				this.set('angle', 90);
				goBattle();
			}
			if (stepFlg === STEP_BATTLE) { // 上下移動
				if (this.y <= 50) this.set('angle', 270);
				if (this.y >= 300) this.set('angle', 90);
			}
		}
	})
	.start();
}

function getoutBoss() {
	if (stageFlg !== 1) return;
	if (boss.get('active')) boss.set('angle', 20);
}

// --------------------

// とぅと郎
function newSpriteTeki2() {
	teki2 = new DGE.Sprite({
		image : 'gfx/teki/20/l.gif', width : 32, height : 32,
		x : 599, y : 200, z : 2,
		velocity : 5, angle : 0,
		life : 90, score : 5000,
		n : 20, group : groupTeki,
		turn : 'up'
	})
	.on('ping', function() {
		if (!this.get('active')) return;
		if (this.isOutOfBounds(true)) {
			numTeki--;
			this.remove();
			return;
		}
		hitAllJikiSh(this, 0.8);
		touchJiki(this);
	})
	.start();
};

function moveTeki2() {
	if (teki2.get('angle') >= 80) teki2.set('turn', 'down');
	else if (teki2.get('angle') <= -80) teki2.set('turn', 'up');
	
	if (teki2.get('turn') === "up") teki2.set('angle', teki2.get('angle') + 5);
	else if (teki2.get('turn') === "down") teki2.set('angle', teki2.get('angle') - 5);
	
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
var BOSS_SH2_DEFS = [
	{ velocity : 10 },
	{ velocity : 5 }
];

function newSpriteBossSh2(num) {
	var def = BOSS_SH2_DEFS[num];
	var wBossSh = 16;
	var hBossSh = 16;
	var xBossSh = 60;
	var yBossSh = 60;
	var angBossSh = Math.atan2((jiki.get('y') - boss.get('y')) * -1, (jiki.get('x') - boss.get('x')) * -1) * 180 / Math.PI;

	new DGE.Sprite({
		image : 'gfx/teki/61/s' + (num) + '.gif', width : wBossSh, height : hBossSh,
		x : boss.x + xBossSh, y : boss.y + yBossSh, z : 2,
		velocity : def.velocity, angle : angBossSh,
		life : 20,
		n : num, group : groupBossSh
	})
	.on('ping', function() {
		if (!this.get('active')) return;
		if (this.isOutOfBounds(true)) {
			this.remove();
			return;
		}
		if (this.get('active') && this.get('n') === 1 && this.get('life') >= 0) {
			this.set('life', this.get('life') - 1);
			turn = "on";
			return;
		}
		if (this.get('life') <= 0 && turn === "on") {
			this.set('angle', Math.atan2((jiki.get('y') - this.get('y')) * -1, (jiki.get('x') - this.get('x')) * -1) * 180 / Math.PI);
			this.set('velocity', this.get('velocity') * 3);
			turn = "off";
			return;
		}
		touchJiki(this);
	})
	.start();
};

//--------------------------------------------------

//パワーアップアイテム [0]:ショット変更 [1]:スピード変更 [2]:ボム
var PWR_DEFS = [
	{ width : 24, height : 16, velocity : 5 },
	{ width : 16, height : 24, velocity : 5 },
	{ width : 16, height : 17, velocity : 10 }
];

function makePwr() {
	var n = Math.floor(Math.random() * PWR_DEFS.length);
	var def = PWR_DEFS[n];
	var velocity = def.velocity;
	var lr = Math.floor(Math.random() * 2);
	var xTeki;
	if (lr === 0) {
		xTeki = DGE.stage.width;
	} else {
		xTeki = -16;
		velocity = velocity * -0.4;
	}

	new DGE.Sprite({
		image : 'gfx/teki/' + (n + 80) + '/l.gif', width : def.width, height : def.height,
		x : xTeki, y : DGE.rand(jiki.height, (DGE.stage.height - 100)), z : 2,
		velocity : velocity,
		n : n, group : groupPwr
	})
	.on('ping', function() {
		if (!this.get('active')) return;
		if (this.isOutOfBounds(true)) {
			this.remove(); // アイテムは敵数(numTeki)に入っていないので減らさない
			return;
		}
		touchJiki(this);
	})
	.start();
};

// --------------------------------------------------
// 1面の雑魚敵定義 (angRange: 進行角のブレ幅。角度は ±angRange/2 の範囲でランダム)
var TEKI1_DEFS = [
	{ width : 16, height : 16, velocity : 5,  life : 2, score : 50,   angRange : 30 },
	{ width : 16, height : 16, velocity : 10, life : 4, score : 1000, angRange : 0 },
	{ width : 16, height : 16, velocity : 3,  life : 3, score : 100,  angRange : 160 },
	{ width : 16, height : 16, velocity : 8,  life : 2, score : 250,  angRange : 90 }
];

// 1面の敵機作る
function makeTeki1() {
	var n = Math.floor(Math.random() * TEKI1_DEFS.length);
	var def = TEKI1_DEFS[n];
	var velocity = def.velocity;
	var angle = Math.floor(Math.random() * def.angRange) - def.angRange / 2;
	var lr = Math.floor(Math.random() * 2);
	var lrTeki;
	var xTeki;
	if (lr === 0) {
		lrTeki = 'l';
		xTeki = DGE.stage.width;
	} else {
		lrTeki = 'r';
		xTeki = -16;
		velocity = velocity * -0.4;
	}

	new DGE.Sprite({
		image : 'gfx/teki/' + n + '/' + lrTeki + '.gif', width : def.width, height : def.height,
		x : xTeki, y : DGE.rand(jiki.height, (DGE.stage.height - 100)), z : 2,
		velocity : velocity, angle : angle,
		life : def.life, score : def.score,
		n : n, group : groupTeki
	})
	.on('ping', function() {
		if (!this.get('active')) return;
		if (this.isOutOfBounds(true)) {
			numTeki--;
			this.remove();
			return;
		}
		if (bombTeki === 1) banSprite(this);
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
};

// 雑魚敵と自機全ショットの当たり判定(レーザーだけ貫通するのでダメージ倍率が別)
function hitAllJikiSh(sprite, laserDamage) {
	hitJikiSh(sprite, 0, numJikiSh1, jikiSh1, 1);
	hitJikiSh(sprite, 0, numJikiSh2, jikiSh2, 1);
	hitJikiSh(sprite, 1, numJikiSh3, jikiSh3, laserDamage);
}

function hitJikiSh(sprite, type, num, jikiSh, damage) {
	for (var i = 0; i < num; i++) {
		if (jikiSh[i].get('active') && sprite.isTouching(jikiSh[i])) {
			sprite.set('life', sprite.get('life') - damage);
			if(type === 1){ // レーザー
			} else {
				jikiSh[i].hide().stop();
			}
			if (sprite.get('life') <= 0) banSprite(sprite);
			return;
		}
	}
}

function banSprite(sprite) {
	if(sprite.get('tag') !== 'boss') { // BOSSのときはスルー
		numTeki--;
	}
	setTxtScore(sprite.get('score'));
	sprite.stop();
	sprite.set('image', 'gfx/ban.gif');
	var that = sprite;
	setTimeout(function() {
		that.remove();
	}, BAN_DURATION_MS);
}

function touchJiki(sprite) {
	if (!sprite.isTouching(jiki)) return;
	if (!isFight()) return;
	if(sprite.get('group') === groupPwr) {
		sprite.remove();
		if (sprite.get('n') === 0) chJikiSh();
		else if (sprite.get('n') === 1) chVelJiki();
		else rmGroupTeki();
	} else {
		goLose();
	}
}

// --------------------------------------------------
// 1面のボス弾
function makeBossSh1(num) {
	var velBossSh = 2;
	var wBossSh = 4;
	var hBossSh = 4;

	var angBossSh;
	var xBossSh;
	var yBossSh;
	if ((num % 2) === 0) {
		angBossSh = (num) * 10;
		xBossSh = 65;
		yBossSh = 55;
	} else {
		angBossSh = (num) * -10;
		xBossSh = 205;
		yBossSh = 35;
	}

	new DGE.Sprite({
		image : 'gfx/teki/60/s1.gif', width : wBossSh, height : hBossSh,
		x : boss.x + xBossSh, y : boss.y + yBossSh, z : 2,
		velocity : velBossSh, angle : angBossSh,
		group : groupBossSh
	})
	.on('ping', function() {
		if (!this.get('active')) return;
		if (this.isOutOfBounds(true)) {
			this.remove();
			return;
		}
		touchJiki(this);
	})
	.start();

	if ((num % 30) === 0 && stepFlg === STEP_BATTLE) {
		new DGE.Sprite({
			image : 'gfx/teki/60/s2.gif', width : 128, height : 2,
			x : boss.x - 120, y : boss.y + 45, z : 2,
			velocity : 4, angle : 10,
			group : groupBossSh
		})
		.on('ping', function() {
			if (!this.get('active')) return;
			if (this.isOutOfBounds(true)) {
				this.remove();
				return;
			}
			touchJiki(this);
		})
		.start();
	}
};

// --------------------------------------------------

function resetSprite() {
	counter = 0;
	velJiki = 5;
	jikiShFlg = 1;
	numTeki = 0;

	DGE.Sprite.execByProperty('group', groupPwr, 'remove');
	DGE.Sprite.execByProperty('group', groupTeki, 'remove');
	if (boss.get('active')) {
		DGE.Sprite.execByProperty('group', groupBossSh, 'remove');
		boss.remove();
	}
}
