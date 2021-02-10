module.exports = api => {
  api.env('production');

  return {
    presets: [
      '@babel/env',
      '@babel/preset-typescript'
    ],
    env: {
      production: {
        presets: ['minify']
      }
    }
  };
};
