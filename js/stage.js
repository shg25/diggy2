import { FPS, PWR_SPAWN_RATE, TEKI1_SPAWN_RATE } from './const.js';
import { state } from './state.js';
import {
	jiki,
	makeTeki1,
	makePwr,
	makeBossSh1,
	newSpriteBossSh2,
	newSpriteTeki2,
	moveTeki2,
} from './sprite.js';
import { STEP_START, STEP_BATTLE, stepFlg, isFight, isFightBoss, transitions } from './flow.js';
import { txtStage } from './text.js';

export const moveJiki = new DGE.Interval({
	delay: DGE.Interval.formatFPS(FPS),
	interval: function () {
		if (DGE.Keyboard.isDown(DGE.Keyboard.UP)) {
			jiki.y -= state.velJiki;
			if (jiki.y <= 0) jiki.y = 0;
			jiki.plot();
		}
		if (DGE.Keyboard.isDown(DGE.Keyboard.DOWN)) {
			jiki.y += state.velJiki;
			if (jiki.y >= DGE.stage.height - jiki.height) jiki.y = DGE.stage.height - jiki.height;
			jiki.plot();
		}
		if (DGE.Keyboard.isDown(DGE.Keyboard.LEFT)) {
			jiki.x -= state.velJiki;
			if (jiki.x <= 0) jiki.x = 0;
			jiki.plot();
		}
		if (DGE.Keyboard.isDown(DGE.Keyboard.RIGHT)) {
			jiki.x += state.velJiki;
			if (jiki.x >= DGE.stage.width - jiki.width) jiki.x = DGE.stage.width - jiki.width;
			jiki.plot();
		}
	},
});

const stage1 = new DGE.Interval({
	delay: DGE.Interval.formatFPS(FPS),
	interval: function () {
		state.counter += 1;
		if (stepFlg === STEP_START && state.counter >= 10) transitions.come();
		if (isFightBoss() && state.counter % 2 === 0) makeBossSh1(state.counter / 2);

		if (!isFight()) return;
		if (DGE.rand(1, PWR_SPAWN_RATE) === 1) makePwr();
		if (state.numTeki === 0 || DGE.rand(1, TEKI1_SPAWN_RATE) === 1) {
			state.numTeki++;
			makeTeki1();
		}
	},
});

const stage2 = new DGE.Interval({
	delay: DGE.Interval.formatFPS(FPS),
	interval: function () {
		state.counter += 1;
		if (stepFlg === STEP_START && state.counter >= 10) transitions.come();
		if (isFightBoss() && state.counter % 16 === 0) newSpriteBossSh2(0);
		if (stepFlg === STEP_BATTLE && state.counter % 50 === 0) newSpriteBossSh2(1);

		if (!isFight()) return;
		if (DGE.rand(1, PWR_SPAWN_RATE) === 1) makePwr();
		moveTeki2();
	},
});

// --------------------------------------------------

export function changeStage() {
	if (state.stageFlg === 1) {
		state.stageFlg = 2;
		txtStage.set('text', 'STAGE 2');
	} else {
		state.stageFlg = 1;
		txtStage.set('text', 'STAGE 1');
	}
}

export function startStage() {
	if (state.stageFlg === 1) {
		stage1.start();
	} else {
		newSpriteTeki2();
		stage2.start();
	}
}

export function stopStage() {
	if (state.stageFlg === 1) {
		if (stage1.get('active')) stage1.stop();
	} else {
		if (stage2.get('active')) stage2.stop();
	}
}
