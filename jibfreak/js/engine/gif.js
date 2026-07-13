// GIFデコーダ(自前実装)。
// canvas の drawImage はアニメGIFの1コマ目しか描かない。DOM(classic)では
// ブラウザが再生してくれていたアニメーションを canvas でも出すために、
// 1989年制定のGIFフォーマットを自分で読んで全コマを展開する。
//
// このファイルは DOM に依存しない純粋なパーサ(Node の単体テストで
// 実素材を検証できる)。canvas 化は assets.js が行う。
//
// 参考: GIF89a Specification (W3C, 1990)

/**
 * @typedef {{ rgba: Uint8ClampedArray, delayMs: number }} GifFrame
 * @typedef {{ width: number, height: number, frames: GifFrame[] }} ParsedGif
 */

/**
 * GIFのバイト列を全コマのRGBAに展開する
 * @param {Uint8Array} bytes
 * @returns {ParsedGif}
 */
export function parseGif(bytes) {
	const sig = String.fromCharCode(...bytes.slice(0, 6));
	if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error(`GIFではない: ${sig}`);

	let pos = 6;
	const u16 = () => bytes[pos++] | (bytes[pos++] << 8);

	// Logical Screen Descriptor
	const width = u16();
	const height = u16();
	const lsdPacked = bytes[pos++];
	pos += 2; // 背景色インデックス・アスペクト比(使わない)
	/** @type {Uint8Array | null} */
	let globalColors = null;
	if (lsdPacked & 0x80) {
		const size = 3 * (1 << ((lsdPacked & 0x07) + 1));
		globalColors = bytes.slice(pos, pos + size);
		pos += size;
	}

	/** @type {GifFrame[]} */
	const frames = [];
	// 合成キャンバス(論理画面サイズのRGBA)。フレームは前のコマの上に重なる
	let working = new Uint8ClampedArray(width * height * 4);

	// 次の画像に適用される Graphic Control Extension の内容
	let delayMs = 100;
	let disposal = 0;
	let transparentIndex = -1;

	while (pos < bytes.length) {
		const block = bytes[pos++];

		if (block === 0x3b) break; // Trailer

		if (block === 0x21) {
			// Extension
			const label = bytes[pos++];
			if (label === 0xf9) {
				// Graphic Control Extension
				pos++; // block size (=4)
				const packed = bytes[pos++];
				disposal = (packed >> 2) & 0x07;
				const delay = u16(); // 1/100秒
				transparentIndex = packed & 0x01 ? bytes[pos++] : (pos++, -1);
				// ブラウザの慣習: 20ms未満の指定は100msとして再生される
				delayMs = delay * 10 < 20 ? 100 : delay * 10;
			}
			// ラベルに関わらずサブブロック列を読み飛ばす
			while (bytes[pos] !== 0) pos += bytes[pos] + 1;
			pos++; // terminator
			continue;
		}

		if (block === 0x2c) {
			// Image Descriptor
			const left = u16();
			const top = u16();
			const w = u16();
			const h = u16();
			const packed = bytes[pos++];
			const interlaced = (packed & 0x40) !== 0;
			let colors = globalColors;
			if (packed & 0x80) {
				const size = 3 * (1 << ((packed & 0x07) + 1));
				colors = bytes.slice(pos, pos + size);
				pos += size;
			}
			if (!colors) throw new Error('カラーテーブルがない');

			const minCodeSize = bytes[pos++];
			// 圧縮データのサブブロックを連結
			let dataLen = 0;
			let scan = pos;
			while (bytes[scan] !== 0) {
				dataLen += bytes[scan];
				scan += bytes[scan] + 1;
			}
			const data = new Uint8Array(dataLen);
			let dp = 0;
			while (bytes[pos] !== 0) {
				const len = bytes[pos++];
				data.set(bytes.slice(pos, pos + len), dp);
				dp += len;
				pos += len;
			}
			pos++; // terminator

			const indices = lzwDecode(minCodeSize, data, w * h);
			const rows = interlaced ? interlaceOrder(h) : null;

			// disposal 3(前の状態に戻す)用に、描く前の状態を控える
			const before = disposal === 3 ? working.slice() : null;

			for (let y = 0; y < h; y++) {
				const destY = top + (rows ? rows[y] : y);
				for (let x = 0; x < w; x++) {
					const idx = indices[y * w + x];
					if (idx === transparentIndex) continue;
					const di = (destY * width + left + x) * 4;
					working[di] = colors[idx * 3];
					working[di + 1] = colors[idx * 3 + 1];
					working[di + 2] = colors[idx * 3 + 2];
					working[di + 3] = 255;
				}
			}
			frames.push({ rgba: working.slice(), delayMs });

			// 次のコマに向けた後片付け
			if (disposal === 2) {
				// 背景色に戻す = 透明で塗る(ブラウザの解釈に合わせる)
				for (let y = top; y < top + h; y++) {
					working.fill(0, (y * width + left) * 4, (y * width + left + w) * 4);
				}
			} else if (disposal === 3 && before) {
				working = before;
			}
			disposal = 0;
			transparentIndex = -1;
			continue;
		}

		throw new Error(`未知のブロック: 0x${block.toString(16)} at ${pos - 1}`);
	}

	if (frames.length === 0) throw new Error('コマが1つもない');
	return { width, height, frames };
}

/**
 * LZW展開(GIF方式: 可変長コード・LSBファースト)
 * @param {number} minCodeSize
 * @param {Uint8Array} data
 * @param {number} pixelCount
 * @returns {Uint8Array} パレットインデックス列
 */
function lzwDecode(minCodeSize, data, pixelCount) {
	const clearCode = 1 << minCodeSize;
	const eoiCode = clearCode + 1;
	let codeSize = minCodeSize + 1;
	/** @type {number[][]} */
	let dict = [];
	/** @type {number[] | null} */
	let prev = null;

	const resetDict = () => {
		dict = [];
		for (let i = 0; i < clearCode; i++) dict[i] = [i];
		dict[clearCode] = [];
		dict[eoiCode] = [];
		codeSize = minCodeSize + 1;
		prev = null;
	};
	resetDict();

	const output = new Uint8Array(pixelCount);
	let op = 0;
	let bitPos = 0;
	const totalBits = data.length * 8;

	while (op < pixelCount && bitPos + codeSize <= totalBits) {
		let code = 0;
		for (let i = 0; i < codeSize; i++) {
			code |= ((data[bitPos >> 3] >> (bitPos & 7)) & 1) << i;
			bitPos++;
		}

		if (code === clearCode) {
			resetDict();
			continue;
		}
		if (code === eoiCode) break;

		/** @type {number[]} */
		let entry;
		if (code < dict.length && dict[code] !== undefined) {
			entry = dict[code];
		} else if (prev) {
			entry = [...prev, prev[0]]; // 辞書にまだ無いコード(KwK)
		} else {
			break;
		}

		for (const px of entry) {
			if (op < pixelCount) output[op++] = px;
		}

		if (prev) {
			dict.push([...prev, entry[0]]);
			if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
		}
		prev = entry;
	}
	return output;
}

/**
 * インターレースGIFの行順(4パス)
 * @param {number} h
 * @returns {number[]}
 */
function interlaceOrder(h) {
	/** @type {number[]} */
	const rows = [];
	for (let y = 0; y < h; y += 8) rows.push(y);
	for (let y = 4; y < h; y += 8) rows.push(y);
	for (let y = 2; y < h; y += 4) rows.push(y);
	for (let y = 1; y < h; y += 2) rows.push(y);
	return rows;
}
