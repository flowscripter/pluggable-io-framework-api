import type { ItemOfKind } from "../item/Item.ts";
import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { StreamHandle } from "../stream/StreamHandle.ts";

/** Capability of a handle that can serve an arbitrary byte range directly. */
export interface RangeReadable<K extends PayloadKind = PayloadKind> {
  /**
   * Opens a new stream of the bytes from offset `start` (inclusive) to
   * offset `end` (exclusive), independent of the handle's own stream.
   *
   * - The range is clamped to the end of the data: an `end` past the end
   *   reads up to the last byte, so `Number.MAX_SAFE_INTEGER` reads to the
   *   end.
   * - When `start >= end`, or `start` is at or past the end of the data,
   *   the stream is empty.
   * - Offsets are non-negative integers in bytes.
   */
  readRange(start: number, end: number): Promise<ReadableStream<ItemOfKind<K>>>;
}

export function isRangeReadable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & RangeReadable<K> {
  return typeof (handle as Partial<RangeReadable<K>>).readRange === "function";
}
