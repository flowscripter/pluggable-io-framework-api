import { describe, expect, test } from "bun:test";
import {
  HOST_DOMAIN,
  PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT,
  PayloadKind,
  type Item,
  type PayloadConverter,
} from "../../../index.ts";

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

describe("PayloadConverter", () => {
  test("extension point constant is a namespaced string distinct from the provider one", () => {
    expect(PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT).toBe(
      "@flowscripter/pluggable-io-framework/payload-converter",
    );
  });

  test("a converter declares endpoints and cost and converts items", () => {
    const converter: PayloadConverter = {
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
    const converted = converter.convert(nativeItem());
    expect(converted.payload.kind).toBe(PayloadKind.Js);
    expect(converter.cost).toBe(1);
  });
});
