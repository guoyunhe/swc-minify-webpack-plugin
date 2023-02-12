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
          stage: (compilation.constructor as any).PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          additionalAssets: true,
        },
        () => this.transformAssets(compilation)
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

  private transformAssets(compilation: webpack.Compilation) {
    const {
      options: { devtool },
    } = compilation.compiler;
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
    compilation: webpack.Compilation
  ) {
    await Promise.all(
      assets.map(async (asset) => {
        const { source, map } = asset.source.sourceAndMap();
        const sourceAsString = source.toString();
        const result = await minify(sourceAsString, {
          ...this.options,
          sourceMap,
        });

        const newSource = sourceMap
          ? new SourceMapSource(
              result.code,
              asset.name,
              result.map as any,
              sourceAsString,
              map as any,
              true
            )
          : new RawSource(result.code);

        compilation.updateAsset(asset.name, newSource, {
          ...asset.info,
          minimized: true,
        });
      })
    );
  }
}
