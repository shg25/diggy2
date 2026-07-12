// JIB-FREAK MOBILE の検証・デバッグ窓口(jibfreak/js/main.js が定義)
interface Window {
	jibfreak: {
		debug: {
			readonly stepFlg: number;
			state: Record<string, number | boolean>;
			jiki: { x: number; y: number; width: number; height: number };
			readonly activeShots: number;
		};
	};
}
