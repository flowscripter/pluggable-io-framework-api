import { describe, expect, test } from "bun:test";
import { type Item, PayloadKind, type StreamHandle, isResumableWritable } from "../../index.ts";

const jsHandle: StreamHandle<PayloadKind.Js> = {
  kind: PayloadKind.Js,
  stream: new WritableStream<Item<PayloadKind.Js>>(),
};

describe("isResumableWritable", () => {
  test("returns false for a plain handle and true when resumeToken is present", () => {
    expect(isResumableWritable(jsHandle)).toBe(false);
    const resumable = { ...jsHandle, resumeToken: () => ({ offset: 0 }) };
    expect(isResumableWritable(resumable)).toBe(true);
  });
});

describe("isResumableWritable with a multipart writer", () => {
  test("returns true only when the writer has resumeToken", () => {
    const writer = { write: async () => {} };
    expect(isResumableWritable(writer)).toBe(false);
    expect(isResumableWritable({ ...writer, resumeToken: () => undefined })).toBe(true);
  });
});
