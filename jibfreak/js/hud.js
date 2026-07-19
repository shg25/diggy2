// スコアとステージ表示。classic の text.js(txtScore/txtStage) から移植。
// classic はスコアを DGE.Text の points プロパティに住まわせていたが、
// 新版では表示(このファイル)とデータ(score変数)を素直に分ける。
import { WIDTH } from './engine/screen.js';
import { state } from './state.js';
import { loadHiScore, saveHiScore } from './storage.js';

let score = 0;
let hiScore = loadHiScore();
let newRecord = false; // このゲームで自己ベストを更新したか

/** @param {number} n 加算する点数 */
export function addScore(n) {
	score += n;
	if (state.demo) return; // デモプレイの成績は記録に残さない(第7回生徒会)
	if (score > hiScore) {
		hiScore = score;
		newRecord = true;
		saveHiScore(hiScore); // 超えた瞬間に保存(途中でタブを閉じても残る)
	}
}

export function resetScore() {
	score = 0;
	newRecord = false;
}

export function getHiScore() {
	return hiScore;
}

export function isNewRecord() {
	return newRecord;
}

export function getScore() {
	return score;
}

/** @param {CanvasRenderingContext2D} ctx */
export function drawHud(ctx) {
	ctx.fillStyle = '#fff';
	ctx.font = '10px Verdana, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText(`SCORE ${score.toLocaleString()}`, 5, 15);
	// 20年前のスタブ(newTxtHiScore)が予約していた位置 x:5, y:25 に置く
	ctx.fillText(`HI-SCORE ${hiScore.toLocaleString()}`, 5, 28);
	ctx.textAlign = 'right';
	ctx.fillText(`STAGE ${state.stageFlg}`, WIDTH - 5, 15);
}
