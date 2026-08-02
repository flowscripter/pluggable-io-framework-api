import type { ChunkKind, ChunkOfKind } from "./ChunkRef.ts";
import type { StreamHandle } from "./StreamHandle.ts";

/** Capability added by the `seekable` decorator: jump to an absolute offset. */
export interface Seekable {
  seek(offset: number): Promise<void>;
}

export function isSeekable<K extends ChunkKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & Seekable {
  return typeof (handle as Partial<Seekable>).seek === "function";
}

/** Capability added by decorators that can serve an arbitrary byte range directly. */
export interface RangeReadable<K extends ChunkKind = ChunkKind> {
  readRange(start: number, end: number): Promise<ReadableStream<ChunkOfKind<K>>>;
}

export function isRangeReadable<K extends ChunkKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & RangeReadable<K> {
  return typeof (handle as Partial<RangeReadable<K>>).readRange === "function";
}

/**
 * A decorator wraps a {@link StreamHandle} and returns an enhanced handle
 * with additional capabilities `C` (e.g. {@link Seekable}). When `C` is
 * known at the call site (the common case - a specific decorator is applied
 * directly), consumers get static typing with no runtime capability check
 * needed. Where a handle arrives already decorated by unknown/dynamic
 * decorators, use the `is*` type guards above instead.
 */
export type StreamDecorator<K extends ChunkKind = ChunkKind, C extends object = object> = (
  handle: StreamHandle<K>,
) => StreamHandle<K> & C;
