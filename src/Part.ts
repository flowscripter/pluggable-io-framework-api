import type { ChunkRef } from "./ChunkRef.ts";

/**
 * One independently readable/writable part of a multipart transfer.
 * Parts may be processed concurrently (e.g. `Promise.all` over N parts);
 * the provider assembles/commits them once all parts finish.
 */
export interface Part {
  readonly index: number;
  readonly offset: number;
  readonly stream: ReadableStream<ChunkRef> | WritableStream<ChunkRef>;
  complete(): Promise<void>;
}
