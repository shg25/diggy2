// 素材読み込み。GIFを自前でデコード(engine/gif.js)して全コマを
// canvas に展開し、アニメーションとして返す。
// canvas の drawImage はアニメGIFの1コマ目しか描かないため、
// DOM(classic)が勝手にやってくれていた再生を自分の手でやる。

/**
 * @typedef {{
 *   width: number, height: number,
 *   frames: HTMLCanvasElement[], delays: number[], totalMs: number
 * }} Anim
 */

import { parseGif } from './gif.js';

/**
 * @param {Record<string, string>} sources 名前 → URL
 * @returns {Promise<Record<string, Anim>>}
 */
export function loadImages(sources) {
	/** @type {Record<string, Anim>} */
	const anims = {};
	const jobs = Object.entries(sources).map(async ([name, url]) => {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`画像の読み込みに失敗: ${url}`);
		const bytes = new Uint8Array(await res.arrayBuffer());
		const gif = parseGif(bytes);

		/** @type {HTMLCanvasElement[]} */
		const frames = [];
		/** @type {number[]} */
		const delays = [];
		let totalMs = 0;
		for (const frame of gif.frames) {
			const canvas = document.createElement('canvas');
			canvas.width = gif.width;
			canvas.height = gif.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('canvas 2d context を取得できない');
			// 通常のArrayBuffer背景のコピーを作る(ImageDataの型要件)
			const rgba = new Uint8ClampedArray(frame.rgba);
			ctx.putImageData(new ImageData(rgba, gif.width, gif.height), 0, 0);
			frames.push(canvas);
			delays.push(frame.delayMs);
			totalMs += frame.delayMs;
		}
		anims[name] = { width: gif.width, height: gif.height, frames, delays, totalMs };
	});
	return Promise.all(jobs).then(() => anims);
}

/**
 * アニメーション時刻 tMs におけるコマを返す。
 * 同じ素材は全個体が同期して動く(DOMのGIF再生と同じ振る舞い)
 * @param {Anim} anim
 * @param {number} tMs
 * @returns {HTMLCanvasElement}
 */
export function frameOf(anim, tMs) {
	if (anim.frames.length === 1) return anim.frames[0];
	let t = tMs % anim.totalMs;
	for (let i = 0; i < anim.frames.length; i++) {
		t -= anim.delays[i];
		if (t < 0) return anim.frames[i];
	}
	return anim.frames[anim.frames.length - 1];
}
