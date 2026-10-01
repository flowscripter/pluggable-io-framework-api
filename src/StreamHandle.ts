import type { ItemOfKind, PayloadKind } from "./Item.ts";

/**
 * The built-in payload type ID: an unstructured byte stream. Any other
 * payload type is an opaque, versioned URI (e.g.
 * `urn:flowscripter:packet:h264-au:1`) whose meaning is defined outside this
 * framework. IDs are matched exactly (no versions or wildcards).
 */
export const BYTES_PAYLOAD_TYPE = "bytes";

/**
 * A handle to a readable or writable stream of a single, declared
 * {@link PayloadKind} - homogeneous, so consumers never need to test each
 * item's kind. Plus optional capability methods for providers/decorators
 * that support more than plain sequential read/write - see the capability
 * interfaces and `is*` guards in `StreamDecorator.ts`.
 */
export interface StreamHandle<K extends PayloadKind = PayloadKind> {
  readonly kind: K;
  readonly stream: ReadableStream<ItemOfKind<K>> | WritableStream<ItemOfKind<K>>;

  /**
   * Whether the stream has a natural end. Defaults to `true`; `false` marks
   * a live source that runs until end-of-stream or a stop. Always declared,
   * never inferred from a missing size.
   */
  readonly bounded?: boolean;

  /**
   * The payload type ID carried by this stream (the link's assigned payload
   * type). Defaults to {@link BYTES_PAYLOAD_TYPE}. Confirmed by the open
   * handle, since some sources only know it after connecting.
   */
  readonly payloadType?: string;
}

/** A JSON-serializable value. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/**
 * Serializable state that lets an interrupted write be resumed via
 * `IOProvider.getWritableStream(path, { resume })`.
 */
export interface ResumeToken {
  /** Bytes committed (best known). */
  readonly offset: number;
  /** Provider-specific state, e.g. `{ uploadId, parts }` or `{ uploadUrl }`. */
  readonly state?: JsonValue;
}

/** Capability of a writable handle that can produce a {@link ResumeToken}. */
export interface ResumableWritable {
  /** Must still work after the handle has failed. */
  resumeToken(): ResumeToken | undefined;
}
