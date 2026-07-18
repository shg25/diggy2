// アトラクトモードの自動操縦(第7回生徒会)。
//
// 乱数シードを固定した「録画の再生」ではなく、状況参照型:
// 毎フレーム、いまの敵・弾・自機の位置を読み、「一定条件で一定の行動」
// のルールで次の操作を決める。だから同じデモは二度と流れないし、
// その回の敵の湧きなりに避けて撃つ。出力は論理アクション
// ('up' 'down' 'left' 'right' 'action')だけで、入力層に流し込めば
// ゲーム側は人間が遊んでいるのと区別がつかない(第5回の設計の配当)。
//
// ルールは3つ。上から順に強い:
//   1. 回避 — いちばん近い脅威が DANGER 距離まで来たら、反対方向へ逃げる
//   2. 位置取り — 脅威がなければ定位置(HOME)へ戻る
//   3. 射撃 — 常に撃つ(連射間隔はゲーム側の仕様に従う)
//
// わざと不完全にしてある。いちばん近い脅威「1つ」しか見ないので
// 挟み撃ちに弱く、定位置に戻りたがるので弾の間を縫う大胆さがない。
// いずれ死ぬ——「俺の方がうまい」と思わせてこそのアトラクトである。
import { jiki } from './player.js';
import { tekis, teki2 } from './enemies.js';
import { boss, bossShots, bossBodyBox } from './boss.js';
import { WIDTH, HEIGHT } from './engine/screen.js';

const HOME = { x: 120, y: 200 }; // 定位置(画面左の中央)
const DANGER = 90; // 脅威がこの距離まで近づいたら回避に切り替える
const DEAD_ZONE = 8; // 目標にこれだけ近ければ動かない(ふらつき防止)
const EDGE = 40; // 画面端のこの幅には自分から入らない

/** @param {{ x: number, y: number, width: number, height: number }} e */
function centerOf(e) {
	return { x: e.x + e.width / 2, y: e.y + e.height / 2 };
}

/**
 * いちばん近い脅威の中心を返す。脅威 = 雑魚・とぅと郎・ボス弾・ボス本体
 * (ボスは体当たり判定の矩形で見る)。何もいなければ null
 * @param {{ x: number, y: number }} me
 * @returns {{ x: number, y: number } | null}
 */
function nearestThreat(me) {
	/** @type {{ x: number, y: number } | null} */
	let nearest = null;
	let best = Infinity;
	/** @param {{ x: number, y: number, width: number, height: number }} e */
	const consider = (e) => {
		const c = centerOf(e);
		const d = (c.x - me.x) ** 2 + (c.y - me.y) ** 2;
		if (d < best) {
			best = d;
			nearest = c;
		}
	};
	for (const t of tekis) if (t.dieTimer === 0) consider(t);
	if (teki2 && teki2.dieTimer === 0) consider(teki2);
	for (const s of bossShots) consider(s);
	if (boss && boss.dieTimer === 0) consider(bossBodyBox(boss));
	if (nearest && best <= DANGER * DANGER) return nearest;
	return null;
}

/**
 * 今フレームの操作を決める。返り値は論理アクションの配列
 * @returns {string[]}
 */
export function autopilotActions() {
	const me = centerOf(jiki);
	const actions = ['action']; // ルール3: 常に撃つ
	const threat = nearestThreat(me);

	// 目標地点を決める(ルール1: 回避 > ルール2: 定位置)
	let target;
	if (threat) {
		// 脅威の反対側へ。ただし画面端に追い詰められる方向へは逃げない
		const dx = me.x <= threat.x ? -60 : 60;
		const dy = me.y <= threat.y ? -60 : 60;
		target = {
			x: Math.min(Math.max(me.x + dx, EDGE), WIDTH - EDGE),
			y: Math.min(Math.max(me.y + dy, EDGE), HEIGHT - EDGE),
		};
	} else {
		target = HOME;
	}

	if (target.x < me.x - DEAD_ZONE) actions.push('left');
	else if (target.x > me.x + DEAD_ZONE) actions.push('right');
	if (target.y < me.y - DEAD_ZONE) actions.push('up');
	else if (target.y > me.y + DEAD_ZONE) actions.push('down');
	return actions;
}
