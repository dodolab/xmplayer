const path = require("path")

module.exports = {
  env: {
    browser: true,
    es6: true,
	},
  extends: [
		"standard",
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
	],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {},
    ecmaVersion: 2018,
    project: path.resolve(__dirname,
		"./tsconfig.json"),
    tsconfigRootDir: __dirname,
    sourceType: "module",
	},
  plugins: [
		"@typescript-eslint",
		"babel",
		"standard"
	],
  rules: {
		"@typescript-eslint/explicit-member-accessibility": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-this-alias": "off",
		"@typescript-eslint/prefer-interface": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unsafe-assignment": "off",
		"quote-props": [
			"error",
			"as-needed"
		],
		"object-shorthand": [
			"error",
			"always"
		],
		"indent": [
			"error",
			"tab"
		],
		"no-var": [
			"error"
		],
		"no-tabs": [
			"off"
		],
		"no-void": [
			"off"
		],
		"no-console": [
			"warn",
			{
        allow: [
					"warn",
					"error",
					"info"
				],
			},
		],
		"no-unused-vars": "off"
	},
}