import type { PayloadKind } from "../payload/PayloadKind.ts";
import type { StreamHandle } from "../StreamHandle.ts";

/** Capability added by the `seekable` decorator: jump to an absolute offset. */
export interface Seekable {
  seek(offset: number): Promise<void>;
}

export function isSeekable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & Seekable {
  return typeof (handle as Partial<Seekable>).seek === "function";
}
