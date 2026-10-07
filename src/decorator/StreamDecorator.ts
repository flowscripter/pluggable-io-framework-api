import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { StreamHandle } from "../stream/StreamHandle.ts";

/**
 * A decorator wraps a {@link StreamHandle} and returns an enhanced handle
 * with additional capabilities `C` (e.g. {@link Seekable}). When `C` is
 * known at the call site (the common case - a specific decorator is applied
 * directly), consumers get static typing with no runtime capability check
 * needed. Where a handle arrives already decorated by unknown/dynamic
 * decorators, use the capability `is*` type guards instead.
 */
export type StreamDecorator<K extends PayloadKind = PayloadKind, C extends object = object> = (
  handle: StreamHandle<K>,
) => StreamHandle<K> & C;
