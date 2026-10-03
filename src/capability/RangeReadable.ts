import type { ItemOfKind } from "../Item.ts";
import type { PayloadKind } from "../payload/PayloadKind.ts";
import type { StreamHandle } from "../StreamHandle.ts";

/** Capability of a handle that can serve an arbitrary byte range directly. */
export interface RangeReadable<K extends PayloadKind = PayloadKind> {
  readRange(start: number, end: number): Promise<ReadableStream<ItemOfKind<K>>>;
}

export function isRangeReadable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & RangeReadable<K> {
  return typeof (handle as Partial<RangeReadable<K>>).readRange === "function";
}
