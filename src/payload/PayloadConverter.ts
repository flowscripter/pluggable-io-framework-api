import type { Item } from "../Item.ts";
import type { PayloadKind } from "./PayloadKind.ts";

/**
 * Converts a single item to the target payload kind. Pure-TS code can only
 * ever implement the identity case (same kind in, same kind out) - a real
 * js<->native conversion needs FFI-capable pointer access and must be
 * supplied by a runtime-specific package (e.g. via `bun:ffi`).
 */
export type PayloadConverter = (item: Item, toKind: PayloadKind) => Item;

/** Identity converter - only handles items whose payload is already of the requested kind. */
export const identityPayloadConverter: PayloadConverter = (item, toKind) => {
  if (item.payload.kind === toKind) {
    return item;
  }
  throw new Error(
    `Cannot convert a "${item.payload.kind}" payload to "${toKind}" without an FFI-capable PayloadConverter`,
  );
};
