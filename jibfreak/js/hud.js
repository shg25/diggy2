// スコアとステージ表示。classic の text.js(txtScore/txtStage) から移植。
// classic はスコアを DGE.Text の points プロパティに住まわせていたが、
// 新版では表示(このファイル)とデータ(score変数)を素直に分ける。
import { WIDTH } from './engine/screen.js';
import { state } from './state.js';

let score = 0;

/** @param {number} n 加算する点数 */
export function addScore(n) {
	score += n;
}

export function resetScore() {
	score = 0;
}

export function getScore() {
	return score;
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawHud(ctx) {
	ctx.fillStyle = '#fff';
	ctx.font = '10px Verdana, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText(`Score: ${score.toLocaleString()}`, 5, 15);
	ctx.textAlign = 'right';
	ctx.fillText(`STAGE ${state.stageFlg}`, WIDTH - 5, 15);
}
