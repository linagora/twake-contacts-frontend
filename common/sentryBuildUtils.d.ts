export declare function isSentryConfigured(): boolean;
/**
 * Utility function to configure and attach the Sentry Webpack/Rspack plugin to Rsbuild.
 *
 * @param appendPlugins Function provided by Rsbuild tools.rspack context to register Rspack plugins
 * @param outputDir The directory where build outputs are placed (defaults to 'dist')
 */
export declare function setupSentryPlugin(appendPlugins: (plugin: any) => void, outputDir?: string): void;
