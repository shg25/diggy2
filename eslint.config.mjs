import js from '@eslint/js';
import globals from 'globals';

export default [
	// エンジンは借り物なので検査しない
	{ ignores: ['lib/', 'node_modules/'] },

	js.configs.recommended,

	{
		files: ['js/**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				DGE: 'readonly' // Diggyエンジンが公開するグローバル
			}
		},
		rules: {
			// レッスン08「比較は厳密に」を機械に見張らせる
			eqeqeq: 'error',
			// レッスン13「varにさよなら」を機械に見張らせる
			'no-var': 'error',
			'prefer-const': 'error'
		}
	}
];
