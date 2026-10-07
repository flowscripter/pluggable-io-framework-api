import type { ZodType } from "zod";
import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { IOProvider } from "./IOProvider.ts";
import type { LocationTarget } from "./LocationTarget.ts";
import type { ProviderContext } from "./ProviderContext.ts";

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
 * `ExtensionDescriptor`. At most one factory may be registered per
 * (`protocol`, `kind`) pair.
 */
export interface IOProviderFactory<
  TConfig = unknown,
  K extends PayloadKind = PayloadKind,
  TLocation = unknown,
> {
  /** The protocol (URI scheme) this factory serves, e.g. `"file"`, `"s3"`, `"https"`. */
  readonly protocol: string;

  /** The payload kind of every provider this factory creates. */
  readonly kind: K;

  /**
   * Native factories only: the memory domains this factory can produce and
   * consume, in preference order.
   */
  readonly domains?: readonly string[];

  /** Payload type IDs this factory's readable streams can produce. Defaults to `["bytes"]`. */
  readonly readPayloadTypes?: readonly string[];

  /** Payload type IDs this factory's writable streams can accept. Defaults to `["bytes"]`. */
  readonly writePayloadTypes?: readonly string[];

  readonly configSchema: ZodType<TConfig>;

  /**
   * Every field a location for this protocol can carry: connection info,
   * entry address (`path`, optional `filename`, optional `pattern`) and
   * credentials. Secret fields are marked with `.meta({ secret: true })`.
   */
  readonly locationSchema: ZodType<TLocation>;

  readonly propertySchema: ZodType<Record<string, unknown>>;

  /** The subset of an entry's `properties` bag that `setProperties` accepts. */
  readonly settablePropertySchema: ZodType<Partial<Record<string, unknown>>>;

  /**
   * Converts a location string (the full input including scheme, or a bare
   * path for `file`) into the raw object that {@link locationSchema} then
   * validates.
   */
  parseLocationString(location: string): unknown;

  /**
   * Splits a validated location into the provider config and an explicit
   * {@link LocationTarget}. The factory performs any protocol-specific join
   * of `path` and `filename` - callers never join.
   */
  toProviderInputs(location: TLocation): { config: TConfig; target: LocationTarget };

  createProvider(config: TConfig, context: ProviderContext): Promise<IOProvider<K>>;
}
