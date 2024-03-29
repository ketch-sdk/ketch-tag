const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './test/test.js',

  output: {
    clean: true,
    iife: true,
    filename: 'ketch.js',
    path: path.resolve(__dirname, 'build'),
  },

  resolve: {
    extensions: ['.ts', '.json', '.js'],
    fallback: {
      crypto: require.resolve('./src/polyfill/crypto.ts'),
    },
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules|__mocks__/,
      },
    ],
  },

  target: ['browserslist:production'],

  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],

  devServer: {
    static: {
      directory: path.join(__dirname, 'test', 'fixtures'),
    },
    compress: true,
    port: 9000,
  },
}
