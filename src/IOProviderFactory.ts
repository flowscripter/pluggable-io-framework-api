import type { ZodType } from "zod";
import type { ChunkKind } from "./ChunkRef.ts";
import type { IOProvider } from "./IOProvider.ts";

/**
 * Extension point constant that a `dynamic-plugin-framework` `Plugin`'s
 * `ExtensionDescriptor.extensionPoint` must match to be discovered as a
 * pluggable-io-framework source/sink provider.
 */
export const PLUGGABLE_IO_FRAMEWORK_PROVIDER_FACTORY_EXTENSION_POINT =
  "@flowscripter/pluggable-io-framework/provider-factory";

/**
 * Returned (as `unknown`, cast at the extension point boundary) from
 * `ExtensionFactory.create()` in a `dynamic-plugin-framework`
 * `ExtensionDescriptor`.
 */
export interface IOProviderFactory<TConfig = unknown, K extends ChunkKind = ChunkKind> {
  readonly configSchema: ZodType<TConfig>;
  readonly propertySchema: ZodType<Record<string, unknown>>;
  createProvider(config: TConfig): Promise<IOProvider<K>>;
}
