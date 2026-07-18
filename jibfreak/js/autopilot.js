// アトラクトモードの自動操縦(第7回生徒会)。
//
// 乱数シードを固定した「録画の再生」ではなく、状況参照型:
// 毎フレーム、いまの敵・弾・自機の位置を読み、「一定条件で一定の行動」
// のルールで次の操作を決める。だから同じデモは二度と流れないし、
// その回の敵の湧きなりに避けて撃つ。出力は論理アクション
// ('up' 'down' 'left' 'right' 'action')だけで、入力層に流し込めば
// ゲーム側は人間が遊んでいるのと区別がつかない(第5回の設計の配当)。
//
// ルールは6つ。上から順に強い:
//   1. 回避 — いちばん近い脅威が DANGER 距離まで来たら、反対方向へ逃げる
//   2. 回り込み — 画面中央まで来た1面ボスより右に居るときは、自分側の
//      上下の縁を通って左へ戻る(前方ショットは右向き。右では反撃できない)
//   3. 警戒 — 脅威が中間距離(DANGER〜SAFE)なら、間合いを保って動かない
//   4. 拾い物 — 安全なら、近く(ITEM_RANGE)のアイテムを取りに行く
//   5. 位置取り — なにもなければ定位置(HOME)へ戻る
//   6. 射撃 — 常に撃つ(連射間隔はゲーム側の仕様に従う)
//
// わざと不完全にしてある。いちばん近い脅威「1つ」しか見ないので
// 挟み撃ちに弱く、定位置に戻りたがるので弾の間を縫う大胆さがない。
// いずれ死ぬ——「俺の方がうまい」と思わせてこそのアトラクトである。
import { jiki } from './player.js';
import { tekis, teki2 } from './enemies.js';
import { boss, bossShots, bossBodyBox } from './boss.js';
import { pwrs } from './items.js';
import { WIDTH, HEIGHT } from './engine/screen.js';

const HOME = { x: 120, y: 200 }; // 定位置(画面左の中央)
const DANGER = 90; // 脅威がこの距離まで近づいたら回避に切り替える
// 定位置へ戻ってよくなる距離(会長発議4)。境界が DANGER の1本だけだと
// 「90pxの外へ逃げる → 戻れの発動 → 戻って90pxの内へ → また逃げる」
// の振り子が境界線上で起きる(危険が少ないときほど目立つ)。
// 逃げたあと、脅威がこの距離より遠くなるまでは定位置へ戻らず、
// その場で構えて待つ——間合いを保つ警戒の動き
const SAFE = 150;
// アイテムを取りに行く距離(会長発議5)。安全なとき(脅威がSAFEより遠い)
// にだけ、この距離内のアイテムへ向かう。遠出はしない——湧き際まで
// 追いかけるのはリスクを冒して取りに行くことになる。
// 300では及び腰だったので450へ(会長発議6:「もう少し頑張って」)
const ITEM_RANGE = 450;
// アイテムは左へ流れるので、真後ろを追わず少し先(左)を迎えに行く。
// 同じ速さで追いかけると永遠に届かない(会長発議6)
const ITEM_LEAD = 40;
const DEAD_ZONE = 8; // 目標にこれだけ近ければ動かない(ふらつき防止)
const EDGE = 40; // 画面端のこの幅には自分から入らない
// 判断の間隔(会長発議)。毎フレーム(1/60秒)判断し直すと小刻みに
// 震えて人間離れするので、一度決めた操作をこの秒数だけ続ける。
// 人間の反応速度に寄せた値で、これを縮めると上手く・機械らしく、
// 伸ばすと下手に・おっとりする(腕前チューニングの入口)
const DECISION_INTERVAL = 0.2;
// 直前の回避を覚えている時間(会長発議3)。最近接の脅威1つだけを
// 見るルールは、2つの脅威の間で「あっちへ避け、こっちへ避け直す」
// の往復(ピンポン)を起こす。往復とはつまり「来た道を引き返す」
// ことなので、この時間内に逃げ直すときは、前回と反対向きの成分を
// 捨てて別の角度で逃げる——引き返しの禁止。
// (判断を長く寝かせる案(0.45秒のやり切り)も試したが、判断しない
// 窓の間に弾に追いつかれて死亡が増えたため撤回した。ボス弾は
// 最大 秒速300px、0.45秒で135px——反応距離90pxを突き抜ける)
const DODGE_MEMORY = 0.6;

let decisionTimer = 0;
/** @type {string[]} 前回の判断(次の判断までこの操作を続ける) */
let lastActions = ['action'];
let memoryTimer = 0;
/** 前回の回避の向き(成分は -60 / 0 / 60) */
let lastDodge = { dx: 0, dy: 0 };

/** デモの開始時に判断の記憶を消す */
export function resetAutopilot() {
	decisionTimer = 0;
	lastActions = ['action'];
	memoryTimer = 0;
	lastDodge = { dx: 0, dy: 0 };
}

/** @param {{ x: number, y: number, width: number, height: number }} e */
function centerOf(e) {
	return { x: e.x + e.width / 2, y: e.y + e.height / 2 };
}

/**
 * いちばん近い脅威の中心と距離を返す。脅威 = 雑魚・とぅと郎・
 * ボス弾・ボス本体(ボスは体当たり判定の矩形で見る)。
 * 距離での絞り込みは呼び出し側の仕事。何もいなければ null
 * @param {{ x: number, y: number }} me
 * @returns {{ x: number, y: number, dist: number } | null}
 */
function nearestThreat(me) {
	let best = Infinity;
	let bestX = 0;
	let bestY = 0;
	/** @param {{ x: number, y: number, width: number, height: number }} e */
	const consider = (e) => {
		const c = centerOf(e);
		const d = (c.x - me.x) ** 2 + (c.y - me.y) ** 2;
		if (d < best) {
			best = d;
			bestX = c.x;
			bestY = c.y;
		}
	};
	for (const t of tekis) if (t.dieTimer === 0) consider(t);
	if (teki2 && teki2.dieTimer === 0) consider(teki2);
	for (const s of bossShots) consider(s);
	if (boss && boss.dieTimer === 0) consider(bossBodyBox(boss));
	if (best === Infinity) return null;
	return { x: bestX, y: bestY, dist: Math.sqrt(best) };
}

/**
 * ITEM_RANGE 内でいちばん近いアイテムの中心を返す。なければ null
 * @param {{ x: number, y: number }} me
 * @returns {{ x: number, y: number } | null}
 */
function nearestItem(me) {
	let best = ITEM_RANGE * ITEM_RANGE;
	let bestX = 0;
	let bestY = 0;
	let found = false;
	for (const p of pwrs) {
		const c = centerOf(p);
		const d = (c.x - me.x) ** 2 + (c.y - me.y) ** 2;
		if (d <= best) {
			best = d;
			bestX = c.x;
			bestY = c.y;
			found = true;
		}
	}
	return found ? { x: bestX, y: bestY } : null;
}

/**
 * 今フレームの操作を返す。判断は DECISION_INTERVAL ごとにだけ行い、
 * 間は前回の操作を続ける(人間は1秒に60回も判断し直さない)
 * @param {number} dt 経過秒
 * @returns {string[]}
 */
export function autopilotActions(dt) {
	decisionTimer -= dt;
	memoryTimer -= dt;
	if (decisionTimer > 0) return lastActions;
	decisionTimer = DECISION_INTERVAL;

	const me = centerOf(jiki);
	const actions = ['action']; // ルール6: 常に撃つ
	const threat = nearestThreat(me);

	// 1面ボスの体当たり判定の中心(回り込みの判定に使う)。
	// 猫バスは画面全体を周回する別の生き物なので、回り込みの対象外
	const boss1 = boss && boss.dieTimer === 0 && boss.n === 0 ? centerOf(bossBodyBox(boss)) : null;

	// 目標地点を決める(回避 > 回り込み > 警戒 > 拾い物 > 定位置)
	let target;
	const item = nearestItem(me);
	if (threat && threat.dist <= DANGER) {
		// 回避: 脅威の反対側へ。ただし画面端に追い詰められる方向へは逃げない
		let dx = me.x <= threat.x ? -60 : 60;
		let dy = me.y <= threat.y ? -60 : 60;
		// 引き返しの禁止(会長発議3): 逃げた直後にまた逃げるなら、
		// 前回と反対向きの成分は捨てて、別の角度で逃げる
		if (memoryTimer > 0) {
			if (dx === -lastDodge.dx) dx = 0;
			if (dy === -lastDodge.dy) dy = 0;
			// 真後ろへ引き返す形なら、上下の広い方へ逃げ直す
			if (dx === 0 && dy === 0) dy = me.y < HEIGHT / 2 ? 60 : -60;
		}
		lastDodge = { dx, dy };
		memoryTimer = DODGE_MEMORY;
		target = {
			x: Math.min(Math.max(me.x + dx, EDGE), WIDTH - EDGE),
			y: Math.min(Math.max(me.y + dy, EDGE), HEIGHT - EDGE),
		};
	} else if (boss1 && boss1.x >= WIDTH / 2 && me.x > boss1.x) {
		// 回り込み(会長発議5): ボスより右では前方(右向き)ショットが
		// 当たらない。上下の縁を通って左へ戻り、反撃の位置を取り直す。
		// 発動はボスが画面中央まで来てから(会長発議6: 登場途中の
		// ボスにまで反応して、開幕から縁に張り付いてしまっていた)。
		// 通る縁は自分が今いる側——上下どちらでもよい(会長答弁)
		const lane = me.y < boss1.y ? EDGE : HEIGHT - EDGE;
		target = { x: Math.max(me.x - 80, EDGE), y: lane };
	} else if (threat && threat.dist <= SAFE) {
		target = me; // 警戒: 中間距離の脅威とは間合いを保ち、その場で構える
	} else if (item) {
		// 拾い物(会長発議5): 安全なときだけ、少し先回りして取りに行く
		target = { x: Math.max(item.x - ITEM_LEAD, EDGE), y: item.y };
	} else {
		target = HOME;
	}

	if (target.x < me.x - DEAD_ZONE) actions.push('left');
	else if (target.x > me.x + DEAD_ZONE) actions.push('right');
	if (target.y < me.y - DEAD_ZONE) actions.push('up');
	else if (target.y > me.y + DEAD_ZONE) actions.push('down');
	lastActions = actions;
	return actions;
}
