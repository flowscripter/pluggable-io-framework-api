import { describe, expect, test } from "bun:test";
import { type IOProvider, type Item, PayloadKind, type ResumableWritable } from "../index.ts";
import {
  entryProperties,
  exampleContext,
  exampleFactory,
  writeEntry,
} from "./fixtures/exampleProvider.ts";

describe("IOProvider contract", () => {
  test("setProperties applies framework fields and validated provider properties", async () => {
    const provider = await exampleFactory.createProvider({ bucket: "b" }, exampleContext);
    await writeEntry(provider, "a", "x");
    const lastModified = new Date(0);
    await provider.setProperties?.("a", {
      lastModified,
      contentType: "text/plain",
      properties: { tag: "t" },
    });
    const properties = await provider.getProperties("a");
    expect(properties.lastModified).toBe(lastModified);
    expect(properties.contentType).toBe("text/plain");
    expect(properties.isContainer).toBe(false);
    expect(properties.properties).toEqual({ tag: "t" });
    await expect(provider.setProperties?.("a", { properties: { tag: 1 } })).rejects.toThrow();
  });

  test("optional members may be absent", () => {
    const minimal: IOProvider<PayloadKind.Js> = {
      kind: PayloadKind.Js,
      async [Symbol.asyncDispose]() {},
      getProperties: async () => entryProperties(undefined),
      getReadableStream: async () => ({ kind: PayloadKind.Js, stream: new ReadableStream() }),
      getWritableStream: async () => ({ kind: PayloadKind.Js, stream: new WritableStream() }),
    };
    expect(minimal.list).toBeUndefined();
    expect(minimal.delete).toBeUndefined();
    expect(minimal.setProperties).toBeUndefined();
    expect(minimal.createContainer).toBeUndefined();
    expect(minimal.joinKey).toBeUndefined();
    expect(minimal.getMultipartWriter).toBeUndefined();
  });

  test("a writable's resume token reopens the write at the committed offset", async () => {
    const provider = await exampleFactory.createProvider({ bucket: "b" }, exampleContext);
    const first = await provider.getWritableStream("r");
    const writer = (first.stream as WritableStream<Item<PayloadKind.Js>>).getWriter();
    await writer.write({
      payload: { kind: PayloadKind.Js, data: new TextEncoder().encode("abc") },
    });
    const token = (first as unknown as ResumableWritable).resumeToken();
    expect(token).toEqual({ offset: 3, state: { path: "r" } });
    expect(JSON.parse(JSON.stringify(token))).toEqual(token);

    const resumed = await provider.getWritableStream("r", { resume: token });
    expect(resumed.startOffset).toBe(3);
    const resumedWriter = (resumed.stream as WritableStream<Item<PayloadKind.Js>>).getWriter();
    await resumedWriter.write({
      payload: { kind: PayloadKind.Js, data: new TextEncoder().encode("de") },
    });
    expect((await provider.getProperties("r")).size).toBe(5);
  });
});
