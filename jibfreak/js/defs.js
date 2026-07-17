// 定義テーブル。classic の sprite.js から値を1つも変えずに移植。
// velocity の単位は classic のまま「px/フレーム(30fps基準)」。
// 時間基準への換算は entity.js が行う(テーブルは当時の姿を保つ)。

// 自機ショット定義 [0]:前 [1]:後 [2]:レーザー
export const JIKI_SH_DEFS = [
	{ image: 'gfx/jiki/s1.gif', width: 8, height: 8, velocity: 16, angle: 180 },
	{ image: 'gfx/jiki/s1.gif', width: 8, height: 8, velocity: 16, angle: 0 },
	{ image: 'gfx/jiki/s3.gif', width: 16, height: 8, velocity: 6, angle: 180 },
];

// 1面の雑魚敵定義 (angRange: 進行角のブレ幅。角度は ±angRange/2 の範囲でランダム)
export const TEKI1_DEFS = [
	{ width: 16, height: 16, velocity: 5, life: 2, score: 50, angRange: 30 },
	{ width: 16, height: 16, velocity: 10, life: 4, score: 1000, angRange: 0 },
	{ width: 16, height: 16, velocity: 3, life: 3, score: 100, angRange: 160 },
	{ width: 16, height: 16, velocity: 8, life: 2, score: 250, angRange: 90 },
];

//パワーアップアイテム [0]:ショット変更 [1]:スピード変更 [2]:ボム
export const PWR_DEFS = [
	{ width: 24, height: 16, velocity: 5 },
	{ width: 16, height: 24, velocity: 5 },
	{ width: 16, height: 17, velocity: 10 },
];

// ボス定義 [0]:1面 [1]:2面(猫バス)
export const BOSS_DEFS = [
	{ width: 278, height: 65, x: -277, y: 300, velocity: 1, angle: 170 },
	{ width: 222, height: 120, x: 599, y: 270, velocity: 10, angle: 0 },
];

// やられ演出の画像(自機・敵・ボスが共用)
export const BAN_IMAGE = 'gfx/ban.gif';

// 当たり判定の定義(第6回生徒会)。ここだけは classic に無かった表。
// 見た目(画像矩形)と判定を分離し、役割ごとにサイズを変える:
// 自機は中央だけが弱点(弾避けの爽快感)、敵は見た目より甘く当たり
// (擦り抜け感の解消)、ボスの体当たりは透明部分で死なないよう狭める。
export const HIT_DEFS = {
	jiki: { width: 8, height: 8 }, // 自機の被弾判定(見た目32x32の中央に置く)
	tekiMargin: 4, // 敵の被弾判定を画像から各辺 +4px 広げる
	bossBodyMargin: 16, // ボスの体当たり判定を画像から各辺 16px 狭める
};
