'use strict';

var FPS = 30;

// やられ演出(ban.gif)の表示時間と、ボムの有効時間。
// 値はどちらも600msだが「意味」が違うので別の名前を持つ
var BAN_DURATION_MS = 600;
var BOMB_DURATION_MS = 600;

// 出現率: 毎フレーム 1/n の確率で出現
var PWR_SPAWN_RATE = 180;
var TEKI1_SPAWN_RATE = 20;

var keyboard;
var counter = 0;
var stageFlg = 1;
var bossFlg = 0;
