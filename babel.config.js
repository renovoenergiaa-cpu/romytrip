module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Substitui import.meta por objeto compatível — resolve SyntaxError no Expo web
      // causado pelo Zustand devtools middleware que usa import.meta.env.MODE
      './babel-plugin-replace-import-meta.js',
    ],
  };
};
