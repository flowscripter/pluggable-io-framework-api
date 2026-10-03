import { describe, expect, test } from "bun:test";
import {
  HOST_DOMAIN,
  PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT,
  PayloadKind,
  type Item,
  type PayloadConverterExtension,
} from "../../index.ts";

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
