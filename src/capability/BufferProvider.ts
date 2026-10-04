import type { NativePayload } from "../payload/NativePayload.ts";
import { PayloadKind } from "../payload/PayloadKind.ts";
import type { StreamHandle } from "../StreamHandle.ts";

/**
 * A sink-provided buffer handed out by a {@link BufferProvider}. The source
 * fills it, then it is either committed or released.
 */
export interface BufferLease {
  readonly ptr: number;
  readonly length: number;
  readonly domain: string;
  readonly descriptor?: NativePayload["descriptor"];
  /** Commits the first `length` bytes of the buffer to the sink. */
  commit(length: number, attributes?: Readonly<Record<string, unknown>>): Promise<void>;
  /** Abandons the lease without committing. Idempotent. */
  release(): void;
}

/**
 * Capability of a writable native handle that hands out its own buffers
 * (e.g. a registered RDMA region or an aligned file buffer) for zero-copy
 * writes. Native only.
 */
export interface BufferProvider {
  readonly domain: string;
  readonly maxOutstanding?: number;
  acquire(sizeHint?: number): Promise<BufferLease>;
}

export function isBufferProvider<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & BufferProvider {
  return (
    (handle.kind as PayloadKind) === PayloadKind.Native &&
    typeof (handle as Partial<BufferProvider>).acquire === "function"
  );
}
