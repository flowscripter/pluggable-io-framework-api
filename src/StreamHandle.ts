import type { ChunkKind, ChunkOfKind } from "./ChunkRef.ts";

/**
 * A handle to a readable or writable stream of a single, declared
 * {@link ChunkKind} - homogeneous, so consumers never need to test each
 * chunk's kind. Plus optional capability methods for providers/decorators
 * that support random-access beyond plain sequential read (e.g. `seekable`)
 * - see {@link Seekable}/{@link isSeekable} in `StreamDecorator.ts`.
 */
export interface StreamHandle<K extends ChunkKind = ChunkKind> {
  readonly kind: K;
  readonly stream: ReadableStream<ChunkOfKind<K>> | WritableStream<ChunkOfKind<K>>;
}
