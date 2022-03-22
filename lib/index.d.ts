import { JsMinifyOptions } from "@swc/core";
import webpack from "webpack";
export interface SwcMinifierWebpackPluginOptions extends JsMinifyOptions {
    sync?: boolean;
}
export default class SwcMinifierWebpackPlugin {
    private readonly sync;
    private readonly options;
    constructor(options?: SwcMinifierWebpackPluginOptions);
    apply(compiler: webpack.Compiler): void;
    private transformAssets;
    private processAssetsSync;
    private processAssets;
}
