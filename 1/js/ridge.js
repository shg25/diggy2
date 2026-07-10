(function() {
	init();
	DGE.Keyboard.on('keyDown', keyDown);
	function keyDown(keyCode) { eventKeyDown(keyCode); }
})();