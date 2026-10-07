import type { ItemOfKind } from "../item/Item.ts";
import { identityPayloadConverter } from "../item/payload/identityPayloadConverter.ts";
import type { PayloadConverter } from "../item/payload/PayloadConverter.ts";
import type { PayloadKind } from "../item/payload/PayloadKind.ts";

/**
 * Adapts a homogeneous stream of one kind to another, using `converter`
 * (by default {@link identityPayloadConverter}, which rejects a kind change). When
 * `fromKind === toKind` the stream is passed straight through untouched (no
 * per-item work at all). This is the ONE place a kind mismatch is decided -
 * once per stream, not once per item.
 */
export function adaptReadableStream<From extends PayloadKind, To extends PayloadKind>(
  stream: ReadableStream<ItemOfKind<From>>,
  fromKind: From,
  toKind: To,
  converter: PayloadConverter = identityPayloadConverter(toKind),
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
      controller.enqueue(converter.convert(value) as ItemOfKind<To>);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
