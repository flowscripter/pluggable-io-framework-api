import type { PayloadKind } from "../payload/PayloadKind.ts";
import type { StreamHandle } from "../StreamHandle.ts";

/**
 * Placeholder capability: a cheap forward-only advance without opening a new
 * connection (e.g. for a future decompression decorator). No current
 * provider implements it.
 */
export interface Skippable {
  skip(bytes: number): Promise<void>;
}

export function isSkippable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & Skippable {
  return typeof (handle as Partial<Skippable>).skip === "function";
}
