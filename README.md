# RIDGE部

[![CI](https://github.com/shg25/diggy2/actions/workflows/ci.yml/badge.svg)](https://github.com/shg25/diggy2/actions/workflows/ci.yml)

昔、友人と作った横スクロールシューティングゲーム。
DHTML（DOM要素を動かして描画する）ゲームエンジン [Diggy](lib/diggy/) の上で動く。

**▶ 遊ぶ: <https://shg25.github.io/diggy2/classic/>** (トップページ: <https://shg25.github.io/diggy2/>)

このリポジトリは、当時のゲームを現代のブラウザで生まれ変わらせるプロジェクト。
動作を保ったまま、少しずつリファクタリングしていく。

## 遊び方

ローカルサーバーを立ててブラウザで開く:

```sh
python3 -m http.server 8720
# → http://localhost:8720/ (トップページ) / http://localhost:8720/classic/ (RIDGE部)
```

- タイトル画面でキーを押すとゲーム開始
- 矢印キーで移動、Z / スペースで射撃

## 開発

```sh
npm install       # 開発ツールのインストール
npm run lint      # コード検査(ESLint)
npm run typecheck # 型検査(JSDoc + tsc)
npm run format    # 整形(Prettier)
npm test          # 単体テスト(状態機械・ミリ秒で完了)
npm run test:e2e  # 回帰テスト(ヘッドレスChromeで実ゲームを遊ぶ・約2分)
```

## ディレクトリ構成

```
index.html        トップページ（各バージョンへの入口）
classic/          RIDGE部（旧作。ゲームは当時のまま、コードは現代化済み）
  index.html      ゲームの入口
  js/             ゲーム本体（ES modules、エントリは js/ridge.js）
  gfx/            画像アセット（jiki=自機, teki=敵）
  lib/diggy/      Diggyエンジン（Matt Hackett作・借り物なので原則いじらない）
  types/          型宣言（JSDoc + tsc用）
docs/             リファクタリングのレッスン集・ロードマップ
test/             単体テスト・E2E回帰テスト
```

新版「JIB-FREEK MOBILE」は `jibfreek/` として今後追加予定（docs/roadmap.md 参照）。

## ライセンス

- **Diggyエンジン** (`lib/diggy/`) は Matt Hackett 氏の **BSDライセンス**
  （2条項BSD、原文: [lib/diggy/LICENSE](lib/diggy/LICENSE)）。
  条件は「再配布時に著作権表示・条件・免責事項を残すこと」のみで、
  改変・商用利用・再配布は自由。原文をそのまま同梱することで条件を
  満たしているため、**このリポジトリの公開や GitHub Pages での配信に
  法的な問題はない**（2026-07-11 確認）。
- **ゲーム本体** (`js/`, `gfx/`) の著作権は制作者2名にある。
  公開時のライセンスは未定。
