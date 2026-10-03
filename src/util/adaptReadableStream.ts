import type { ItemOfKind } from "../Item.ts";
import { type PayloadConverter, identityPayloadConverter } from "../payload/PayloadConverter.ts";
import type { PayloadKind } from "../payload/PayloadKind.ts";

/**
 * Adapts a homogeneous stream of one kind to another, using `convert`. When
 * `fromKind === toKind` the stream is passed straight through untouched (no
 * per-item work at all). This is the ONE place a kind mismatch is decided -
 * once per stream, not once per item.
 */
export function adaptReadableStream<From extends PayloadKind, To extends PayloadKind>(
  stream: ReadableStream<ItemOfKind<From>>,
  fromKind: From,
  toKind: To,
  convert: PayloadConverter = identityPayloadConverter,
): ReadableStream<ItemOfKind<To>> {
  if ((fromKind as PayloadKind) === (toKind as PayloadKind)) {
    return stream as unknown as ReadableStream<ItemOfKind<To>>;
  }
  const reader = stream.getReader();
  return new ReadableStream<ItemOfKind<To>>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(convert(value, toKind) as ItemOfKind<To>);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
