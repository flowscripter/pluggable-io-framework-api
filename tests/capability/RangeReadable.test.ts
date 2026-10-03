import { describe, expect, test } from "bun:test";
import { PayloadKind, isRangeReadable, type Item, type StreamHandle } from "../../index.ts";

const jsHandle: StreamHandle<PayloadKind.Js> = {
  kind: PayloadKind.Js,
  stream: new ReadableStream<Item<PayloadKind.Js>>(),
};

describe("isRangeReadable", () => {
  test("returns false for a plain handle and true when readRange is present", () => {
    expect(isRangeReadable(jsHandle)).toBe(false);
    const ranged = {
      ...jsHandle,
      readRange: async () => new ReadableStream<Item<PayloadKind.Js>>(),
    };
    expect(isRangeReadable(ranged)).toBe(true);
  });
});
