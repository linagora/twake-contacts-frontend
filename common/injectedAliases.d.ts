/**
 * Returns a mapping of injected component aliases for Rsbuild and Jest.
 * @param appDir The root directory of the application (e.g. __dirname from rsbuild.config.ts)
 * @param overrides A mapping of specific @injected/* paths to their custom implementations
 */
export declare function getInjectedAliases(appDir: string, overrides: string[]): Record<string, string>;
