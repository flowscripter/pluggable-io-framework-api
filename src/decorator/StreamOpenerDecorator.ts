import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { StreamHandle } from "../stream/StreamHandle.ts";

/**
 * A decorator that wraps the function opening a {@link StreamHandle} rather
 * than the handle itself (e.g. a local cache that decides whether to open
 * the underlying stream at all).
 */
export type StreamOpenerDecorator<
  K extends PayloadKind = PayloadKind,
  C extends object = object,
> = (open: () => Promise<StreamHandle<K>>) => () => Promise<StreamHandle<K> & C>;
