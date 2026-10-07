import type { Item } from "../Item.ts";
import type { PayloadKind } from "./PayloadKind.ts";

/**
 * Extension point constant that a `dynamic-plugin-framework` `Plugin`'s
 * `ExtensionDescriptor.extensionPoint` must match to be discovered as a
 * {@link PayloadConverter}.
 */
export const PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT =
  "@flowscripter/pluggable-io-framework/payload-converter";

/**
 * Converts a single item from the payload kind and domain a converter
 * declares in `from` to the ones it declares in `to`.
 */
export type convertFunc = (item: Item) => Item;

/**
 * Converts items between payload kinds and/or memory domains. Converters are
 * registered as plugin extensions, and the registry uses them during
 * negotiation when source and sink share no common (kind, domain). A real
 * js<->native conversion needs FFI-capable pointer access, so such
 * converters are supplied by runtime-specific packages.
 */
export interface PayloadConverter {
  readonly from: { readonly kind: PayloadKind; readonly domain?: string };
  readonly to: { readonly kind: PayloadKind; readonly domain?: string };
  /** `0` = zero-copy, `1` = copies. */
  readonly cost: 0 | 1;
  readonly convert: convertFunc;
}
