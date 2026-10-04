import { describe, expect, test } from "bun:test";
import { HOST_DOMAIN, PayloadKind, identityPayloadConverter, type Item } from "../../index.ts";

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
