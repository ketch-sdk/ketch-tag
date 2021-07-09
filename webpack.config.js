const path = require('path');

module.exports = {
  entry: './src/index.ts',

  output: {
    library: '__ketch__',
    libraryTarget: 'window',
    filename: 'ketch-tag.js',
    path: path.resolve(__dirname, 'dist')
  },

  resolve: {
    extensions: ['.ts', '.js', '.json']
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.jsx?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      }
    ],
  },
};
