// エンティティ(弾・敵などの動くもの)の共通処理。
// 移動則は Diggy 互換: 角度を (270 - angle) に読み替えて sin/cos を取る。
// この独特な変換を再実装することで、classic の定義テーブルの角度が
// そのまま使える(lib/diggy/core/dge.js の getCoordsByAngleVelocity 参照)。
import { FPS } from './const.js';
import { WIDTH, HEIGHT } from './engine/screen.js';

/**
 * @typedef {{
 *   x: number, y: number, width: number, height: number,
 *   velocity: number, angle: number, active: boolean, imageKey: string
 * }} Entity
 */

/**
 * 角度と速度に従って進める。velocity の単位は classic のまま
 * 「px/フレーム(30fps基準)」なので、FPS を掛けて px/秒 に換算する。
 * @param {Entity} e
 * @param {number} dt 経過秒
 */
export function advance(e, dt) {
	const rad = ((270 - e.angle) * Math.PI) / 180;
	const speed = e.velocity * FPS * dt;
	e.x += Math.sin(rad) * speed;
	e.y += Math.cos(rad) * speed;
}

/**
 * 完全に画面外へ出たか(classic の isOutOfBounds(true) 相当)
 * @param {Entity} e
 */
export function isOutOfBounds(e) {
	return e.x + e.width < 0 || e.x > WIDTH || e.y + e.height < 0 || e.y > HEIGHT;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, HTMLImageElement>} images
 * @param {Entity} e
 */
export function drawEntity(ctx, images, e) {
	if (!e.active) return;
	ctx.drawImage(images[e.imageKey], Math.round(e.x), Math.round(e.y));
}

/**
 * 矩形どうしの接触判定(classic の isTouching 相当)
 * @param {{ x: number, y: number, width: number, height: number }} a
 * @param {{ x: number, y: number, width: number, height: number }} b
 */
export function isTouching(a, b) {
	return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * min〜max の整数乱数(classic の DGE.rand 相当)
 * @param {number} min
 * @param {number} max
 */
export function randInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
