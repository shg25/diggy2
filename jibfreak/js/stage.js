// ステージ進行。classic の stage.js(stage1 interval) から移植。
// 30Hz の固定タイムステップで、ゲームの「1フレーム分の判断」を束ねる。
// counter はボス登場のタイミング等に使う(classic と同じ)。
import { state } from './state.js';
import { FPS } from './const.js';
import { STEP_START, stepFlg, isFightBoss, transitions } from './flow.js';
import { tickTekis } from './enemies.js';
import { tickPwrs } from './items.js';
import { tickBoss, makeBossSh1 } from './boss.js';

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
		if (stepFlg === STEP_START && state.counter >= 10) transitions.come();
		if (isFightBoss() && state.counter % 2 === 0) makeBossSh1(state.counter / 2);
		tickPwrs();
		tickTekis();
		tickBoss();
	}
}
