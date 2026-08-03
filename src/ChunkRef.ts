/**
 * The two possible chunk memory origins.
 */
export enum ChunkKind {
  Js = "js",
  Native = "native",
}

/** A chunk whose payload lives in a normal JS-managed Uint8Array. */
export interface JsChunk {
  readonly kind: ChunkKind.Js;
  readonly data: Uint8Array;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

/**
 * A chunk whose payload lives in memory owned outside the JS heap (e.g. a
 * Rust-allocated buffer). `release()` must be called once nothing needs the
 * buffer - ownership/lifetime is explicit rather than GC'd, since JS code
 * cannot safely retain a raw pointer past the point its owner frees it.
 */
export interface NativeChunk {
  readonly kind: ChunkKind.Native;
  readonly ptr: number;
  readonly length: number;
  release(): void;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

/**
 * A chunk of stream payload, tagged with its memory origin/ownership.
 */
export type ChunkRef = JsChunk | NativeChunk;

/** The concrete chunk type produced by a stream tagged with a given kind. */
export type ChunkOfKind<K extends ChunkKind> = Extract<ChunkRef, { kind: K }>;

/**
 * Converts a single chunk to the target kind. Pure-TS code can only ever
 * implement the identity case (same kind in, same kind out) - a real
 * js<->native conversion needs FFI-capable pointer access and must be
 * supplied by a runtime-specific package (e.g. via `bun:ffi`).
 */
export type ChunkConverter = (chunk: ChunkRef, toKind: ChunkKind) => ChunkRef;

/** Identity converter - only handles chunks already of the requested kind. */
export const identityChunkConverter: ChunkConverter = (chunk, toKind) => {
  if (chunk.kind === toKind) {
    return chunk;
  }
  throw new Error(
    `Cannot convert a "${chunk.kind}" chunk to "${toKind}" without an FFI-capable ChunkConverter`,
  );
};

/**
 * Adapts a homogeneous stream of one kind to another, using `convert`. When
 * `fromKind === toKind` the stream is passed straight through untouched (no
 * per-chunk work at all). This is the ONE place a kind mismatch is decided -
 * once per stream link, not once per chunk.
 */
export function adaptReadableStream<From extends ChunkKind, To extends ChunkKind>(
  stream: ReadableStream<ChunkOfKind<From>>,
  fromKind: From,
  toKind: To,
  convert: ChunkConverter = identityChunkConverter,
): ReadableStream<ChunkOfKind<To>> {
  if ((fromKind as ChunkKind) === (toKind as ChunkKind)) {
    return stream as unknown as ReadableStream<ChunkOfKind<To>>;
  }
  const reader = stream.getReader();
  return new ReadableStream<ChunkOfKind<To>>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(convert(value, toKind) as ChunkOfKind<To>);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/**
 * Adapter to the standard Web Streams interop surface (fetch, pipeTo
 * external consumers). This is the one clearly-marked copy boundary -
 * internal source/sink/decorator code speaks {@link ChunkRef} directly.
 */
export function toWebReadableStream(source: ReadableStream<JsChunk>): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      // value is statically a JsChunk here - no per-chunk kind check needed.
      controller.enqueue(value.data);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export function fromWebReadableStream(source: ReadableStream<Uint8Array>): ReadableStream<JsChunk> {
  const reader = source.getReader();
  return new ReadableStream<JsChunk>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue({ kind: ChunkKind.Js, data: value });
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
