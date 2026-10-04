import type { Item } from "../Item.ts";
import type { PayloadKind } from "./PayloadKind.ts";

/**
 * Extension point constant that a `dynamic-plugin-framework` `Plugin`'s
 * `ExtensionDescriptor.extensionPoint` must match to be discovered as a
 * {@link PayloadConverterExtension}.
 */
export const PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT =
  "@flowscripter/pluggable-io-framework/payload-converter";

/**
 * A payload converter registered as a plugin extension. The registry uses
 * converters during negotiation when source and sink share no common
 * (kind, domain).
 */
export interface PayloadConverterExtension {
  readonly from: { readonly kind: PayloadKind; readonly domain?: string };
  readonly to: { readonly kind: PayloadKind; readonly domain?: string };
  /** `0` = zero-copy, `1` = copies. */
  readonly cost: 0 | 1;
  convert(item: Item): Item;
}
