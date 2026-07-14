// 効果音。録音素材は使わず、オシレータ(発振器)で波形を合成する——
// インベーダーやファミコンの音源チップと同じ原理。
// 矩形波=硬いピコピコ、三角波=丸い音、ノイズ=爆発、と使い分ける。
//
// 既定はミュート(会長答弁: スマホ展開を見据え、保存もしない)。
// AudioContext はブラウザの自動再生制限のため、ミュート解除の
// ユーザー操作の中で初めて作る。

/** @type {AudioContext | null} */
let audio = null;
let muted = true;
let requested = 0; // 検証用: 鳴らそうとした回数(ミュート中も数える)

function ensure() {
	if (!audio) audio = new AudioContext();
	if (audio.state === 'suspended') audio.resume();
}

/** ミュートを切り替える(ユーザー操作の中から呼ぶこと) @returns {boolean} 音が出る状態か */
export function toggleMute() {
	muted = !muted;
	if (!muted) ensure();
	return !muted;
}

export function isMuted() {
	return muted;
}

/** 検証用: play が呼ばれた回数 */
export function soundRequests() {
	return requested;
}

/**
 * 短い発振音。attack後に指数減衰するエンベロープ付き
 * @param {number} freq 開始周波数(Hz)
 * @param {number} dur 長さ(秒)
 * @param {{ type?: OscillatorType, vol?: number, slide?: number, at?: number }} [opts]
 *   slide: 終了周波数(下降音・上昇音用) / at: 開始オフセット(秒)
 */
function beep(freq, dur, opts = {}) {
	if (!audio) return;
	const { type = 'square', vol = 0.1, slide = freq, at = 0 } = opts;
	const t0 = audio.currentTime + at;
	const osc = audio.createOscillator();
	const gain = audio.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, t0);
	if (slide !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(slide, 1), t0 + dur);
	gain.gain.setValueAtTime(vol, t0);
	gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
	osc.connect(gain).connect(audio.destination);
	osc.start(t0);
	osc.stop(t0 + dur);
}

/**
 * ノイズの一撃(爆発用)
 * @param {number} dur 長さ(秒)
 * @param {number} vol
 * @param {number} [at] 開始オフセット(秒)
 */
function noiseBurst(dur, vol, at = 0) {
	if (!audio) return;
	const t0 = audio.currentTime + at;
	const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * dur), audio.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	const src = audio.createBufferSource();
	src.buffer = buffer;
	const gain = audio.createGain();
	gain.gain.setValueAtTime(vol, t0);
	gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
	src.connect(gain).connect(audio.destination);
	src.start(t0);
}

/**
 * 効果音を鳴らす。ミュート中は数だけ数えて何もしない
 * @param {'shot' | 'explosion' | 'hit' | 'item' | 'bossCome' | 'win' | 'record' | 'unlock'} name
 * @param {number} [delaySec] 開始を遅らせる(ジングルの重なり回避用)
 */
export function play(name, delaySec = 0) {
	requested++;
	if (muted || !audio) return;
	const at = delaySec;
	switch (name) {
		case 'shot': // 短いピッ(連射してもうるさくない音量)
			beep(880, 0.05, { vol: 0.04, slide: 660, at });
			break;
		case 'explosion': // ノイズのドン
			noiseBurst(0.12, 0.12, at);
			beep(110, 0.12, { vol: 0.08, slide: 40, at });
			break;
		case 'hit': // 被弾: 長めの下降音
			beep(400, 0.4, { vol: 0.12, slide: 60, at });
			break;
		case 'item': // 上昇のピロッ
			beep(880, 0.06, { type: 'triangle', vol: 0.1, at });
			beep(1320, 0.08, { type: 'triangle', vol: 0.1, at: at + 0.06 });
			break;
		case 'bossCome': // 低い警告×3
			for (let i = 0; i < 3; i++) beep(110, 0.1, { vol: 0.12, at: at + i * 0.16 });
			break;
		case 'win': // 引き締まった3音(ド・ミ・ソ)
			beep(523, 0.09, { vol: 0.1, at });
			beep(659, 0.09, { vol: 0.1, at: at + 0.1 });
			beep(784, 0.14, { vol: 0.1, at: at + 0.2 });
			break;
		case 'record': // NEW RECORD のキラッ
			beep(784, 0.07, { type: 'triangle', vol: 0.1, at });
			beep(1568, 0.12, { type: 'triangle', vol: 0.1, at: at + 0.08 });
			break;
		case 'unlock': // ステージ2解放
			beep(659, 0.08, { vol: 0.1, at });
			beep(880, 0.08, { vol: 0.1, at: at + 0.09 });
			beep(1174, 0.14, { vol: 0.1, at: at + 0.18 });
			break;
	}
}
