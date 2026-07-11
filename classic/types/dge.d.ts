// Diggyエンジン(lib/diggy/)の型宣言。
// エンジン本体は借り物なので触らない代わりに、ゲームから見える
// 表面だけをここに書く。エンジンの実装と食い違ったらここを直す。

/** DGE.Sprite / DGE.Text のインスタンス */
interface DGESprite {
	x: number;
	y: number;
	width: number;
	height: number;
	/** 汎用プロパティバッグの読み取り(active, life, angle, n など) */
	get(key: string): any;
	set(key: string, value: unknown): DGESprite;
	/** ping はフレームごとに呼ばれる。this はスプライト自身 */
	on(event: string, handler: (this: DGESprite) => void): DGESprite;
	plot(x?: number, y?: number): DGESprite;
	show(): DGESprite;
	hide(): DGESprite;
	start(): DGESprite;
	stop(): DGESprite;
	remove(): void;
	isOutOfBounds(entirely?: boolean): boolean;
	isTouching(other: DGESprite): boolean;
	center(): DGESprite;
}

interface DGEInterval {
	start(): void;
	stop(): void;
	get(key: string): any;
}

declare const DGE: {
	init(config: { id: string; background: string; width: number; height: number }): void;
	/** min〜max の整数乱数 */
	rand(min: number, max: number): number;
	sprintf(format: string, ...args: unknown[]): string;
	formatNumber(n: number): string;
	stage: { width: number; height: number };
	Keyboard: {
		SPACE: number;
		UP: number;
		DOWN: number;
		LEFT: number;
		RIGHT: number;
		isDown(code: number): boolean;
		on(event: string, handler: (keyCode: number) => void): void;
	};
	Loader: new (files: string[]) => unknown;
	Interval: {
		new (config: { delay: number; interval: () => void }): DGEInterval;
		formatFPS(fps: number): number;
	};
	Sprite: {
		new (config: Record<string, unknown>): DGESprite;
		execByProperty(key: string, value: string, method: string): void;
	};
	Text: new (config: Record<string, unknown>) => DGESprite;
};
