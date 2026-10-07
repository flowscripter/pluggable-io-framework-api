import { describe, expect, test } from "bun:test";
import {
  HOST_DOMAIN,
  PayloadKind,
  adaptReadableStream,
  type Item,
  type PayloadConverter,
} from "../../index.ts";

function jsItem(text: string): Item<PayloadKind.Js> {
  return { payload: { kind: PayloadKind.Js, data: new TextEncoder().encode(text) } };
}

describe("adaptReadableStream", () => {
  test("passes stream through untouched when kinds already match", () => {
    const original = new ReadableStream<Item<PayloadKind.Js>>();
    const adapted = adaptReadableStream(original, PayloadKind.Js, PayloadKind.Js);
    expect(adapted).toBe(original);
  });

  test("converts each item once when kinds differ, preserving attributes", async () => {
    const source = new ReadableStream<Item<PayloadKind.Js>>({
      start(controller) {
        controller.enqueue({ ...jsItem("hi"), attributes: { discontinuity: true, seq: 1 } });
        controller.close();
      },
    });
    let conversions = 0;
    const converter: PayloadConverter = {
      from: { kind: PayloadKind.Js },
      to: { kind: PayloadKind.Native, domain: HOST_DOMAIN },
      cost: 1,
      convert: (item) => {
        conversions += 1;
        if (item.payload.kind === PayloadKind.Js) {
          return {
            attributes: item.attributes,
            payload: {
              kind: PayloadKind.Native,
              domain: HOST_DOMAIN,
              ptr: 0,
              length: item.payload.data.byteLength,
              release: () => {},
            },
          };
        }
        throw new Error("unexpected conversion in test");
      },
    };

    const adapted = adaptReadableStream(source, PayloadKind.Js, PayloadKind.Native, converter);
    const reader = adapted.getReader();
    const { value } = await reader.read();
    expect(value?.payload.kind).toBe(PayloadKind.Native);
    expect(value?.payload.domain).toBe(HOST_DOMAIN);
    expect(value?.payload.length).toBe(2);
    expect(value?.attributes?.discontinuity).toBe(true);
    expect(conversions).toBe(1);
    expect((await reader.read()).done).toBe(true);
  });

  test("uses identityPayloadConverter by default, which rejects a kind change", async () => {
    const source = new ReadableStream<Item<PayloadKind.Js>>({
      start(controller) {
        controller.enqueue(jsItem("x"));
      },
    });
    const reader = adaptReadableStream(source, PayloadKind.Js, PayloadKind.Native).getReader();
    await expect(reader.read()).rejects.toThrow("without an FFI-capable PayloadConverter");
  });
});
