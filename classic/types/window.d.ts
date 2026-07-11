// 検証・デバッグ用の窓口(js/ridge.js が定義、テストが利用する)
interface Window {
	ridge: {
		debug: {
			state: Record<string, number | boolean>;
			readonly stepFlg: number;
			readonly boss: DGESprite;
			readonly jiki: DGESprite;
			readonly bossTurnMode: number;
			readonly score: number;
			readonly poolSizes: number[];
			isPlay(): boolean;
			isFightBoss(): boolean;
			goWin(): void;
			goLose(): void;
			makePwr(): void;
			makeTeki1(): void;
			newSpriteBossSh2(num: number): void;
		};
	};
}
