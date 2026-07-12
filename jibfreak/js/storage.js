// 記録の保存。localStorage に永続化する。
// 使えない環境(プライベートモード・埋め込み等)では、その場かぎりの
// メモリに退避してゲーム自体は止めない。
const KEY = 'jibfreak.hiscore';

let memoryFallback = 0;

/** @returns {number} 保存されている自己ベスト(なければ0) */
export function loadHiScore() {
	try {
		return Number(localStorage.getItem(KEY)) || 0;
	} catch {
		return memoryFallback;
	}
}

/** @param {number} score */
export function saveHiScore(score) {
	try {
		localStorage.setItem(KEY, String(score));
	} catch {
		memoryFallback = score;
	}
}
