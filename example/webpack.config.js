const HtmlWebpackPlugin = require('html-webpack-plugin');
const { SwcMinifyWebpackPlugin } = require('../dist');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
            },
          },
        },
      },
    ],
  },
  devtool: 'source-map',
  entry: __dirname + '/index.js',
  output: {
    path: __dirname + '/dist',
  },
  optimization: {
    minimize: true,
    minimizer: [new SwcMinifyWebpackPlugin()],
    // minimizer: [new TerserPlugin({minify: TerserPlugin.swcMinify})],
  },
  plugins: [new HtmlWebpackPlugin()],
};
