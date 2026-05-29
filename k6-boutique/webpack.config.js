const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'test.main':    './src/main.js',
    'test.browser': './src/browser.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs',
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  target: 'web',
  // Exclude k6 built-ins and remote imports from the bundle — they are
  // provided by the k6 runtime at execution time.
  externals: /^(k6|https?:\/\/)(\/.*)?/,
  optimization: {
    minimize: false,
  },
};
