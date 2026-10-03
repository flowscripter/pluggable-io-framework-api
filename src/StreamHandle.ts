import type { ItemOfKind } from "./Item.ts";
import type { PayloadKind } from "./payload/PayloadKind.ts";

/**
 * A handle to a readable or writable stream of a single, declared
 * {@link PayloadKind} - homogeneous, so consumers never need to test each
 * item's kind. Plus optional capability methods for providers/decorators
 * that support more than plain sequential read/write - see the capability
 * interfaces and `is*` guards in `capability/`.
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
   * The payload type ID carried by this stream. Defaults to
   * {@link BYTES_PAYLOAD_TYPE}. Confirmed by the open
   * handle, since some sources only know it after connecting.
   */
  readonly payloadType?: string;
}
