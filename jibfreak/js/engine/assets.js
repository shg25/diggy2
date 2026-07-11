// 素材読み込み。名前→URLの表を渡すと、全部読み終えてから
// 名前→Image の表で返す(1枚でも失敗したら起動しない)。

/**
 * @param {Record<string, string>} sources 名前 → URL
 * @returns {Promise<Record<string, HTMLImageElement>>}
 */
export function loadImages(sources) {
	/** @type {Record<string, HTMLImageElement>} */
	const images = {};
	const jobs = Object.entries(sources).map(
		([name, url]) =>
			new Promise((resolve, reject) => {
				const img = new Image();
				img.onload = () => {
					images[name] = img;
					resolve(undefined);
				};
				img.onerror = () => reject(new Error(`画像の読み込みに失敗: ${url}`));
				img.src = url;
			}),
	);
	return Promise.all(jobs).then(() => images);
}
