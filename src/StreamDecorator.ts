import type { StreamHandle } from "./StreamHandle.ts";

/**
 * A decorator wraps a {@link StreamHandle} and returns an enhanced handle
 * with additional capability methods (e.g. `seekable` adds `seek`/
 * `readRange`; `locally-cached` transparently serves repeated reads from a
 * local cache).
 */
export type StreamDecorator = (handle: StreamHandle) => StreamHandle;
