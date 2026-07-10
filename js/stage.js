'use strict';

var moveJiki = new DGE.Interval({
	delay : DGE.Interval.formatFPS(30),
	interval : function() {
		if (keyboard.isDown(keyboard.UP)) {
			jiki.y -= velJiki;
			if (jiki.y <= 0) jiki.y = 0;
			jiki.plot();
		}
		if (keyboard.isDown(keyboard.DOWN)) {
			jiki.y += velJiki;
			if (jiki.y >= (DGE.stage.height - jiki.height)) jiki.y = (DGE.stage.height - jiki.height);
			jiki.plot();
		}
		if (keyboard.isDown(keyboard.LEFT)) {
			jiki.x -= velJiki;
			if (jiki.x <= 0) jiki.x = 0;
			jiki.plot();
		}
		if (keyboard.isDown(keyboard.RIGHT)) {
			jiki.x += velJiki;
			if (jiki.x >= (DGE.stage.width - jiki.width)) jiki.x = (DGE.stage.width - jiki.width);
			jiki.plot();
		}
	}
});

var stage1 = new DGE.Interval({
	delay : DGE.Interval.formatFPS(30),
	interval : function() {
		counter += 1;
		if (stepFlg === STEP_START && counter >= 10) goCome();
		if (isFightBoss() && (counter % 2) === 0) makeBossSh1(counter / 2);
		
		if (!isFight()) return;
		if ((DGE.rand(1, 180) === 1)) makePwr();
		if ((numTeki === 0) || (DGE.rand(1, 20) === 1)) {
			numTeki++;
			makeTeki1();
		}
	}
});

var stage2 = new DGE.Interval({
	delay : DGE.Interval.formatFPS(30),
	interval : function() {
		counter += 1;
		if (stepFlg === STEP_START && counter >= 10) goCome();
		if (isFightBoss() && (counter % 16) === 0) newSpriteBossSh2(0);
		if (stepFlg === STEP_BATTLE && (counter % 50) === 0) newSpriteBossSh2(1);
		
		if (!isFight()) return;
		if ((DGE.rand(1, 180) === 1)) makePwr();
		moveTeki2();
	}
});

// --------------------------------------------------

function changeStage(){
	if (stageFlg === 1){
		stageFlg = 2;
		txtStage.set('text', 'STAGE 2');
	} else {
		stageFlg = 1;
		txtStage.set('text', 'STAGE 1');
	}
}

function startStage() {
	if (stageFlg === 1) {
		stage1.start();
	} else {
		newSpriteTeki2();
		stage2.start();
	}
}

function stopStage() {
	if (stageFlg === 1) {
		if (stage1.get('active')) stage1.stop();
	} else {
		if (stage2.get('active')) stage2.stop();
	}
}