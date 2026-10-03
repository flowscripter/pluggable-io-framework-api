import { PayloadKind } from "../payload/PayloadKind.ts";
import type { StreamHandle } from "../StreamHandle.ts";
import type { BufferLease } from "./BufferProvider.ts";

/**
 * Capability of a readable native handle that can fill a sink-provided
 * {@link BufferLease} directly. Native only.
 */
export interface FillReadable {
  readonly domains: readonly string[];
  /** Resolves with the number of bytes written into the lease, or `null` at end of stream. */
  readInto(lease: BufferLease): Promise<number | null>;
}

export function isFillReadable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & FillReadable {
  return (
    (handle.kind as PayloadKind) === PayloadKind.Native &&
    typeof (handle as Partial<FillReadable>).readInto === "function"
  );
}
