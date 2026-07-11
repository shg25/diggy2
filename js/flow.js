// ゲーム進行の状態機械(最下層)。
// 「いまどの状態か」だけを知っていて、演出やスプライトには依存しない。

export const STEP_TITLE  = 0;
export const STEP_RETURN = 1;
export const STEP_READY  = 10;
export const STEP_START  = 11;
export const STEP_COME   = 12;
export const STEP_BATTLE = 13;
export const STEP_WIN    = 14;
export const STEP_LOSE   = 19;

export let stepFlg = 0;

export function setStep(step) {
	stepFlg = step;
	if (step === STEP_TITLE) console.log('goTitle');
	else if (step === STEP_RETURN) console.log('goReturn');
	else if (step === STEP_READY) console.log('goReady');
	else if (step === STEP_START) console.log('goStart');
	else if (step === STEP_COME) console.log('goCome');
	else if (step === STEP_BATTLE) console.log('goBattle');
	else if (step === STEP_WIN) console.log('goWin');
	else if (step === STEP_LOSE) console.log('goLose');
	else console.log('go????');
}

export function isPlay() {
	if(stepFlg === STEP_READY || stepFlg === STEP_START || stepFlg === STEP_COME || stepFlg === STEP_BATTLE || stepFlg === STEP_WIN) {
		return true;
	}
	return false;
}

export function isFight() {
	if(stepFlg === STEP_START || stepFlg === STEP_COME || stepFlg === STEP_BATTLE) {
		return true;
	}
	return false;
}

export function isFightBoss() {
	if(stepFlg === STEP_COME || stepFlg === STEP_BATTLE) {
		return true;
	}
	return false;
}

// 場面遷移のフック(依存性逆転)。
// 実体は最上位の step.js が起動時に登録する。
// 下位レイヤー(sprite, stage)は「〜が起きた」をこれ経由で知らせるだけで、
// その結果どんな演出が走るかを知らない。
export const transitions = {
	come : () => {},   // ボス登場(ステージ進行が発火)
	battle : () => {}, // ボス戦開始(ボスの動きが発火)
	lose : () => {}    // 自機被弾(当たり判定が発火)
};
