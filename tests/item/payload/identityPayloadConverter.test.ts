import { describe, expect, test } from "bun:test";
import { HOST_DOMAIN, PayloadKind, identityPayloadConverter, type Item } from "../../../index.ts";

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
  test("declares a zero-cost conversion from and to the same kind", () => {
    const converter = identityPayloadConverter(PayloadKind.Native);
    expect(converter.from).toEqual({ kind: PayloadKind.Native });
    expect(converter.to).toEqual({ kind: PayloadKind.Native });
    expect(converter.cost).toBe(0);
  });

  test("returns the same item when the payload is already of the requested kind", () => {
    const item = jsItem("a");
    expect(identityPayloadConverter(PayloadKind.Js).convert(item)).toBe(item);
    const native = nativeItem();
    expect(identityPayloadConverter(PayloadKind.Native).convert(native)).toBe(native);
  });

  test("throws when a kind change is requested", () => {
    expect(() => identityPayloadConverter(PayloadKind.Native).convert(jsItem("a"))).toThrow(
      'Cannot convert a "js" payload to "native"',
    );
    expect(() => identityPayloadConverter(PayloadKind.Js).convert(nativeItem())).toThrow(
      'Cannot convert a "native" payload to "js"',
    );
  });
});
