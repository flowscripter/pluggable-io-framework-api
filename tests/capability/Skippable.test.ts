import { describe, expect, test } from "bun:test";
import { PayloadKind, isSkippable, type Item, type StreamHandle } from "../../index.ts";

const jsHandle: StreamHandle<PayloadKind.Js> = {
  kind: PayloadKind.Js,
  stream: new ReadableStream<Item<PayloadKind.Js>>(),
};

describe("isSkippable", () => {
  test("returns false for a plain handle and true when skip is present", () => {
    expect(isSkippable(jsHandle)).toBe(false);
    const skippable = { ...jsHandle, skip: async () => {} };
    expect(isSkippable(skippable)).toBe(true);
  });
});
