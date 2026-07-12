// ステージ進行。classic の stage.js(stage1 interval) から移植。
// 30Hz の固定タイムステップで、ゲームの「1フレーム分の判断」を束ねる。
// counter はボス登場のタイミング等に使う(classic と同じ)。
import { state } from './state.js';
import { FPS } from './const.js';
import { tickTekis } from './enemies.js';
import { tickPwrs } from './items.js';

const TICK = 1 / FPS;
let tickAccum = 0;

export function resetStage() {
	tickAccum = 0;
	state.counter = 0;
}

/** @param {number} dt 経過秒 */
export function updateStage(dt) {
	tickAccum += dt;
	while (tickAccum >= TICK) {
		tickAccum -= TICK;
		state.counter += 1;
		tickPwrs();
		tickTekis();
	}
}
