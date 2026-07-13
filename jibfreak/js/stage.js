// ステージ進行。classic の stage.js(stage1 interval) から移植。
// 30Hz の固定タイムステップで、ゲームの「1フレーム分の判断」を束ねる。
// counter はボス登場のタイミング等に使う(classic と同じ)。
import { state } from './state.js';
import { FPS } from './const.js';
import { STEP_START, stepFlg, isFightBoss, transitions } from './flow.js';
import { STEP_BATTLE } from './flow.js';
import { tickTekis, tickTeki2, spawnTeki2 } from './enemies.js';
import { tickPwrs } from './items.js';
import { tickBoss, makeBossSh1, makeBossSh2 } from './boss.js';

const TICK = 1 / FPS;
let tickAccum = 0;
let started = false; // このゲームでステージ進行が始まったか

export function resetStage() {
	tickAccum = 0;
	started = false;
	state.counter = 0;
}

/** @param {number} dt 経過秒 */
export function updateStage(dt) {
	tickAccum += dt;
	while (tickAccum >= TICK) {
		tickAccum -= TICK;
		if (!started) {
			started = true;
			if (state.stageFlg !== 1) spawnTeki2(); // classic の startStage
		}
		state.counter += 1;
		if (stepFlg === STEP_START && state.counter >= 10) transitions.come();
		if (state.stageFlg === 1) {
			if (isFightBoss() && state.counter % 2 === 0) makeBossSh1(state.counter / 2);
		} else {
			// 2面: 直進弾は16フレームごと、追尾弾は暴れ中に50フレームごと(classic)
			if (isFightBoss() && state.counter % 16 === 0) makeBossSh2(0);
			if (stepFlg === STEP_BATTLE && state.counter % 50 === 0) makeBossSh2(1);
		}
		tickPwrs();
		tickTekis();
		tickTeki2();
		tickBoss();
	}
}
