// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Texto do app na fonte do Romy (Plus Jakarta Sans): use src/components/ui/Text
    files: ['app/**/*.tsx', 'src/**/*.tsx'],
    ignores: ['src/components/ui/Text.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'react-native',
          importNames: ['Text', 'TextInput'],
          message: 'Use Text e TextInput de src/components/ui/Text (fonte do Romy e pesos certos no Android e no web).',
        }],
      }],
    },
  },
]);
