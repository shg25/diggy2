// JIB-FREAK MOBILE の検証・デバッグ窓口(jibfreak/js/main.js が定義)
interface Window {
	jibfreak: {
		debug: {
			readonly stepFlg: number;
		};
	};
}
