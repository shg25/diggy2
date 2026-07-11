// エントリポイント。ここから全モジュールが繋がる
import { init } from './step.js';
import { eventKeyDown } from './set.js';
import { state } from './state.js';
import * as flow from './flow.js';
import * as step from './step.js';
import * as sprite from './sprite.js';
import * as text from './text.js';

init();
DGE.Keyboard.on('keyDown', function(keyCode) { eventKeyDown(keyCode); });

// 検証・デバッグ用の窓口。
// モジュール化で「全部グローバル」は消えたので、代わりに
// 意図して公開する唯一のグローバルをここに定義する。
// ゲーム本体のコードはこのオブジェクトに依存してはいけない
window.ridge = {
	debug : {
		state : state,
		get stepFlg() { return flow.stepFlg; },
		get boss() { return sprite.boss; },
		get jiki() { return sprite.jiki; },
		get bossTurnMode() { return sprite.bossTurnMode; },
		get score() { return text.txtScore ? text.txtScore.get('points') : 0; },
		get poolSizes() { return [sprite.jikiSh1.length, sprite.jikiSh2.length, sprite.jikiSh3.length]; },
		isPlay : flow.isPlay,
		isFightBoss : flow.isFightBoss,
		goWin : step.goWin,
		goLose : step.goLose,
		makePwr : sprite.makePwr,
		makeTeki1 : sprite.makeTeki1,
		newSpriteBossSh2 : sprite.newSpriteBossSh2
	}
};
