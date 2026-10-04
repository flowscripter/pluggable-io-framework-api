import type { Item } from "../Item.ts";
import { PayloadKind } from "../payload/PayloadKind.ts";

/**
 * Adapter to the standard Web Streams interop surface (fetch, pipeTo
 * external consumers). This is the one clearly-marked copy boundary -
 * internal source/sink/decorator code speaks {@link Item} directly. Item
 * attributes are dropped.
 */
export function toWebReadableStream(
  source: ReadableStream<Item<PayloadKind.Js>>,
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      // value is statically a js item here - no per-item kind check needed.
      controller.enqueue(value.payload.data);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export function fromWebReadableStream(
  source: ReadableStream<Uint8Array>,
): ReadableStream<Item<PayloadKind.Js>> {
  const reader = source.getReader();
  return new ReadableStream<Item<PayloadKind.Js>>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue({ payload: { kind: PayloadKind.Js, data: value } });
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
