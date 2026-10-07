import type { PayloadKind } from "./PayloadKind.ts";
import type { PayloadConverter } from "./PayloadConverter.ts";

/**
 * The zero-cost converter for items already of `kind`: each item is
 * returned unchanged, and an item of any other kind is rejected.
 */
export function identityPayloadConverter(kind: PayloadKind): PayloadConverter {
  return {
    from: { kind },
    to: { kind },
    cost: 0,
    convert(item) {
      if (item.payload.kind === kind) {
        return item;
      }
      throw new Error(
        `Cannot convert a "${item.payload.kind}" payload to "${kind}" without an FFI-capable PayloadConverter`,
      );
    },
  };
}
