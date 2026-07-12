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
