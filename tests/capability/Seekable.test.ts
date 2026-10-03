import { describe, expect, test } from "bun:test";
import { PayloadKind, isSeekable, type Item, type StreamHandle } from "../../index.ts";

const jsHandle: StreamHandle<PayloadKind.Js> = {
  kind: PayloadKind.Js,
  stream: new ReadableStream<Item<PayloadKind.Js>>(),
};

describe("isSeekable", () => {
  test("returns false for a plain handle and true once decorated", () => {
    expect(isSeekable(jsHandle)).toBe(false);
    const seekable = { ...jsHandle, seek: async () => {} };
    expect(isSeekable(seekable)).toBe(true);
  });
});
