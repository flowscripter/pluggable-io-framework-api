import type { ChunkRef } from "./ChunkRef.ts";

/**
 * A handle to a readable or writable stream of {@link ChunkRef}s, plus
 * optional capability methods for providers/decorators that support
 * random-access beyond plain sequential read (e.g. `seekable`).
 *
 * Capability methods are present only when supported - consumers
 * feature-detect via `typeof handle.seek === "function"` etc.
 */
export interface StreamHandle {
  readonly stream: ReadableStream<ChunkRef> | WritableStream<ChunkRef>;
  seek?(offset: number): Promise<void>;
  readRange?(start: number, end: number): Promise<ReadableStream<ChunkRef>>;
}
