import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { IOProvider } from "./IOProvider.ts";
import type { LocationTarget } from "./LocationTarget.ts";

/**
 * Lets a provider obtain other installed providers (e.g. a composite
 * protocol layered over `s3`/`https`, or a wrapper such as compression)
 * instead of bundling its own clients. `kind`/`domain` default to the
 * calling provider's, so items pass through unconverted. The calling
 * provider owns every provider it resolves and must dispose them in its own
 * `[Symbol.asyncDispose]`.
 */
export interface ProviderResolver {
  createProviderForLocation(
    location: string,
    opts?: { kind?: PayloadKind; domain?: string },
  ): Promise<{ provider: IOProvider; target: LocationTarget }>;
}

/** Passed to `IOProviderFactory.createProvider` alongside the provider config. */
export interface ProviderContext {
  /** The memory domain chosen by negotiation (native providers only). */
  readonly domain?: string;
  readonly resolver: ProviderResolver;
}
