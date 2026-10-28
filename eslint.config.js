// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Agent/editor tooling isn't app code (same folders .easignore keeps out of EAS uploads).
    ignores: ['dist/*', '.agents/*', '.argent/*', '.claude/*', '.cursor/*', '.vscode/*'],
  },
]);
