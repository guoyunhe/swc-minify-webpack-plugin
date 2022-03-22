import { JsMinifyOptions, minify, minifySync } from "@swc/core";
import webpack from "webpack";
import { RawSource, SourceMapSource } from "webpack-sources";

const { version } = require("../package.json");

const isJsFile = /\.[cm]?js(\?.*)?$/i;

const pluginName = "swc-minifier";

export default class SwcMinifierWebpackPlugin {
  private readonly options: JsMinifyOptions = {
    compress: true,
    mangle: true,
  };

  constructor(options: JsMinifyOptions = {}) {
    Object.assign(this.options, options);
  }

  apply(compiler: webpack.Compiler) {
    const meta = JSON.stringify({
      name: pluginName,
      version,
      options: this.options,
    });

    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.chunkHash.tap(pluginName, (_, hash) =>
        hash.update(meta)
      );

      const tapMethod = "tapPromise";

      compilation.hooks.processAssets[tapMethod](
        {
          name: pluginName,
          stage: (compilation.constructor as any)
            .PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
          additionalAssets: true,
        },
        () => this.transformAssets(compilation)
      );

      compilation.hooks.statsPrinter.tap(pluginName, (statsPrinter) => {
        statsPrinter.hooks.print
          .for("asset.info.minimized")
          .tap(pluginName, (minimized, { green, formatFlag }) =>
            minimized ? green(formatFlag("minimized")) : ""
          );
      });
    });
  }

  private async transformAssets(compilation: webpack.Compilation) {
    const {
      options: { devtool },
    } = compilation.compiler;
    const sourceMap =
      this.options.sourceMap === undefined
        ? !!devtool && devtool.includes("source-map")
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
          sourceMap: Boolean(sourceMap),
        });

        compilation.updateAsset(
          asset.name,
          sourceMap
            ? new SourceMapSource(
                result.code,
                asset.name,
                result.map as any,
                sourceAsString,
                map as any,
                true
              )
            : new RawSource(result.code),
          {
            ...asset.info,
            minimized: true,
          }
        );
      })
    );
  }
}
