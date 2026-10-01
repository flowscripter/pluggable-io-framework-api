import { describe, expect, test } from "bun:test";
import {
  HOST_DOMAIN,
  PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT,
  PayloadKind,
  adaptReadableStream,
  identityPayloadConverter,
  type Item,
  type PayloadConverter,
  type PayloadConverterExtension,
} from "../index.ts";

function jsItem(text: string): Item<PayloadKind.Js> {
  return { payload: { kind: PayloadKind.Js, data: new TextEncoder().encode(text) } };
}

function nativeItem(): Item<PayloadKind.Native> {
  return {
    payload: {
      kind: PayloadKind.Native,
      domain: HOST_DOMAIN,
      ptr: 0,
      length: 0,
      release: () => {},
    },
  };
}

describe("identityPayloadConverter", () => {
  test("returns the same item when the payload is already of the requested kind", () => {
    const item = jsItem("a");
    expect(identityPayloadConverter(item, PayloadKind.Js)).toBe(item);
    const native = nativeItem();
    expect(identityPayloadConverter(native, PayloadKind.Native)).toBe(native);
  });

  test("throws when a kind change is requested", () => {
    expect(() => identityPayloadConverter(jsItem("a"), PayloadKind.Native)).toThrow(
      'Cannot convert a "js" payload to "native"',
    );
    expect(() => identityPayloadConverter(nativeItem(), PayloadKind.Js)).toThrow(
      'Cannot convert a "native" payload to "js"',
    );
  });
});

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
    const convert: PayloadConverter = (item, toKind) => {
      conversions += 1;
      if (item.payload.kind === PayloadKind.Js && toKind === PayloadKind.Native) {
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
    };

    const adapted = adaptReadableStream(source, PayloadKind.Js, PayloadKind.Native, convert);
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

describe("PayloadConverterExtension", () => {
  test("extension point constant is a namespaced string distinct from the provider one", () => {
    expect(PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT).toBe(
      "@flowscripter/pluggable-io-framework/payload-converter",
    );
  });

  test("an extension declares endpoints and cost and converts items", () => {
    const extension: PayloadConverterExtension = {
      from: { kind: PayloadKind.Native, domain: HOST_DOMAIN },
      to: { kind: PayloadKind.Js },
      cost: 1,
      convert(item) {
        if (item.payload.kind !== PayloadKind.Native) {
          throw new Error("expected native");
        }
        return {
          attributes: item.attributes,
          payload: { kind: PayloadKind.Js, data: new Uint8Array(item.payload.length) },
        };
      },
    };
    const converted = extension.convert(nativeItem());
    expect(converted.payload.kind).toBe(PayloadKind.Js);
    expect(extension.cost).toBe(1);
  });
});
