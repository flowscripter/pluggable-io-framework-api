import { describe, expect, test } from "bun:test";
import {
  HOST_DOMAIN,
  PayloadKind,
  isFillReadable,
  type FillReadable,
  type Item,
  type StreamHandle,
} from "../../index.ts";

const jsHandle: StreamHandle<PayloadKind.Js> = {
  kind: PayloadKind.Js,
  stream: new ReadableStream<Item<PayloadKind.Js>>(),
};

const nativeHandle: StreamHandle<PayloadKind.Native> = {
  kind: PayloadKind.Native,
  stream: new ReadableStream<Item<PayloadKind.Native>>(),
};

describe("isFillReadable", () => {
  const fill: FillReadable = { domains: [HOST_DOMAIN], readInto: async () => null };

  test("returns true for a native handle with readInto", () => {
    expect(isFillReadable(nativeHandle)).toBe(false);
    expect(isFillReadable({ ...nativeHandle, ...fill })).toBe(true);
  });

  test("returns false for a js handle even with readInto (native only)", () => {
    expect(isFillReadable({ ...jsHandle, ...fill })).toBe(false);
  });
});
