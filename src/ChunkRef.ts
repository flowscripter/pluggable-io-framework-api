/**
 * A chunk of stream payload, tagged with its memory origin/ownership.
 *
 * This is the actual unit flowing through {@link StreamHandle} and
 * {@link Part} streams - not a TS-vs-Rust-specific type. A pure-TS pipeline
 * is simply a stream of `kind: "js"` chunks end to end.
 *
 * Tagging origin lets a consumer choose a zero-copy pointer handoff when
 * compatible (js -> rust always; rust -> rust always) or fall back to an
 * explicit copy when required (rust -> js, since JS code cannot safely
 * retain a raw pointer past the call that produced it).
 *
 * `attributes` is deliberately shaped close to the future Flowscripter
 * runtime's Item (attributes + payload) so this type is a natural fit if/when
 * an `adapt` operator wraps these streams later. It is unused today.
 */
export type ChunkRef =
  | {
      readonly kind: "js";
      readonly data: Uint8Array;
      readonly attributes?: Readonly<Record<string, unknown>>;
    }
  | {
      readonly kind: "native";
      readonly ptr: number;
      readonly length: number;
      release(): void;
      readonly attributes?: Readonly<Record<string, unknown>>;
    };

/**
 * Copy a chunk's bytes into a plain Uint8Array, regardless of origin.
 * The only copy incurred is for `kind: "native"` chunks.
 */
export function toUint8Array(chunk: ChunkRef): Uint8Array {
  if (chunk.kind === "js") {
    return chunk.data;
  }
  throw new Error(
    "Copying a native ChunkRef to Uint8Array requires an FFI-capable runtime helper - not implemented in pluggable-io-framework-api",
  );
}

/**
 * Adapter to the standard Web Streams interop surface (fetch, pipeTo
 * external consumers). This is the one clearly-marked copy boundary -
 * internal source/sink/decorator code speaks {@link ChunkRef} directly.
 */
export function toWebReadableStream(source: ReadableStream<ChunkRef>): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(toUint8Array(value));
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export function fromWebReadableStream(
  source: ReadableStream<Uint8Array>,
): ReadableStream<ChunkRef> {
  const reader = source.getReader();
  return new ReadableStream<ChunkRef>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue({ kind: "js", data: value });
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
