const SwcMinifyWebpackPlugin = require('../lib');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [new SwcMinifyWebpackPlugin()],
  },
};
