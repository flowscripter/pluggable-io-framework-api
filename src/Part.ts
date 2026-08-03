import type { ChunkKind, ChunkOfKind } from "./ChunkRef.ts";

/**
 * One independently readable/writable part of a multipart transfer, carrying
 * a homogeneous stream of a single declared {@link ChunkKind}. Parts may be
 * processed concurrently (e.g. `Promise.all` over N parts); the provider
 * assembles/commits them once all parts finish.
 */
export interface Part<K extends ChunkKind = ChunkKind> {
  readonly index: number;
  readonly offset: number;
  readonly kind: K;
  readonly stream: ReadableStream<ChunkOfKind<K>> | WritableStream<ChunkOfKind<K>>;
  complete(): Promise<void>;
}
