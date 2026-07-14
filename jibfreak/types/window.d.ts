// JIB-FREAK MOBILE の検証・デバッグ窓口(jibfreak/js/main.js が定義)
interface Window {
	jibfreak: {
		debug: {
			readonly stepFlg: number;
			state: Record<string, number | boolean>;
			jiki: { x: number; y: number; width: number; height: number };
			readonly activeShots: number;
			readonly enemyCount: number;
			readonly pwrCount: number;
			readonly boss: { x: number; y: number; life: number; turnMode: number } | null;
			readonly bossShotCount: number;
			readonly score: number;
			readonly hiScore: number;
			readonly selectedStage: number;
			readonly stage2Unlocked: boolean;
			readonly soundMuted: boolean;
			readonly soundRequests: number;
		};
	};
}
