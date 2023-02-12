const { SwcMinifyWebpackPlugin } = require('../dist');

module.exports = {
  mode: 'production',
  entry: __dirname + '/index.js',
  output: {
    path: __dirname + '/dist',
  },
  optimization: {
    minimize: true,
    minimizer: [new SwcMinifyWebpackPlugin()],
  },
};
