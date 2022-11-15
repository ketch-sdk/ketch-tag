const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/test.ts',

  output: {
    clean: true,
    iife: true,
    filename: 'ketch.js',
    path: path.resolve(__dirname, 'build'),
  },

  resolve: {
    extensions: ['.ts', '.json', '.js'],
    fallback: {
      'crypto': require.resolve('./src/polyfill/crypto.ts'),
      'util': require.resolve('util/'),
    }
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
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
