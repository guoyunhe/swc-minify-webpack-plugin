import { JsMinifyOptions, minify } from '@swc/core';
import webpack from 'webpack';

const { RawSource, SourceMapSource } = webpack.sources;

const isJsFile = /\.[cm]?js(\?.*)?$/i;

export class SwcMinifyWebpackPlugin {
  private readonly options: JsMinifyOptions = {
    compress: true,
    mangle: true,
  };

  constructor(options: JsMinifyOptions = {}) {
    Object.assign(this.options, options);
  }

  apply(compiler: webpack.Compiler) {
    const pluginName = this.constructor.name;
    const meta = JSON.stringify({
      name: pluginName,
      version: PACKAGE_VERSION,
      options: this.options,
    });

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.chunkHash.tap(pluginName, (_, hash) => hash.update(meta));

      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          additionalAssets: true,
        },
        () => this.optimize(compiler, compilation),
      );

      compilation.hooks.statsPrinter.tap(pluginName, (stats) => {
        stats.hooks.print
          .for('asset.info.minimized')
          .tap(PACKAGE_NAME || '', (minimized, { green, formatFlag }) => {
            if (minimized) {
              if (green && formatFlag) {
                return green(formatFlag('minimized'));
              } else {
                return 'minimized';
              }
            } else {
              return '';
            }
          });
      });
    });
  }

  private optimize(compiler: webpack.Compiler, compilation: webpack.Compilation) {
    const {
      options: { devtool },
    } = compiler;
    const sourceMap =
      this.options.sourceMap === undefined
        ? !!devtool && devtool.includes('source-map')
        : this.options.sourceMap;
    const assets = compilation
      .getAssets()
      .filter((asset) => !asset.info.minimized && isJsFile.test(asset.name));

    return this.processAssets(assets, sourceMap, compilation);
  }

  private async processAssets(
    assets: webpack.Asset[],
    sourceMap: boolean,
    compilation: webpack.Compilation,
  ) {
    await Promise.all(
      assets.map(async (asset) => {
        const { source, map } = asset.source.sourceAndMap();

        const output = await minify(Buffer.isBuffer(source) ? source.toString() : source, {
          ...this.options,
          sourceMap,
        });

        let newMap;

        if (output.map) {
          newMap = JSON.parse(output.map);
          newMap.sources = [asset.name];
        }

        const newSource =
          sourceMap && newMap
            ? new SourceMapSource(output.code, asset.name, newMap, source, map, true)
            : new RawSource(output.code);

        const newInfo = { ...asset.info, minimized: true };

        compilation.updateAsset(asset.name, newSource, newInfo);
      }),
    );
  }
}
