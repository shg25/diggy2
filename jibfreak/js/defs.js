// 定義テーブル。classic の sprite.js から値を1つも変えずに移植。
// velocity の単位は classic のまま「px/フレーム(30fps基準)」。
// 時間基準への換算は entity.js が行う(テーブルは当時の姿を保つ)。

// 自機ショット定義 [0]:前 [1]:後 [2]:レーザー
export const JIKI_SH_DEFS = [
	{ image: 'gfx/jiki/s1.gif', width: 8, height: 8, velocity: 16, angle: 180 },
	{ image: 'gfx/jiki/s1.gif', width: 8, height: 8, velocity: 16, angle: 0 },
	{ image: 'gfx/jiki/s3.gif', width: 16, height: 8, velocity: 6, angle: 180 },
];
