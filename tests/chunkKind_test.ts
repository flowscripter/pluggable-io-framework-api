import { describe, expect, test } from "bun:test";
import {
  adaptReadableStream,
  isSeekable,
  type ChunkConverter,
  type JsChunk,
  type NativeChunk,
  type StreamHandle,
} from "../index.ts";

describe("adaptReadableStream", () => {
  test("passes stream through untouched when kinds already match", () => {
    const original = new ReadableStream<JsChunk>();
    const adapted = adaptReadableStream(original, "js", "js");
    expect(adapted).toBe(original);
  });

  test("converts each chunk once when kinds differ, using the supplied converter", async () => {
    const source = new ReadableStream<JsChunk>({
      start(controller) {
        controller.enqueue({ kind: "js", data: new TextEncoder().encode("hi") });
        controller.close();
      },
    });
    let conversions = 0;
    const convert: ChunkConverter = (chunk, toKind) => {
      conversions += 1;
      if (chunk.kind === "js" && toKind === "native") {
        return {
          kind: "native",
          ptr: 0,
          length: chunk.data.byteLength,
          release: () => {},
        } as NativeChunk;
      }
      throw new Error("unexpected conversion in test");
    };

    const adapted = adaptReadableStream(source, "js", "native", convert);
    const reader = adapted.getReader();
    const { value } = await reader.read();
    expect(value?.kind).toBe("native");
    expect(conversions).toBe(1);
  });
});

describe("isSeekable", () => {
  test("returns false for a plain handle and true once decorated", () => {
    const plain: StreamHandle<"js"> = { kind: "js", stream: new ReadableStream<JsChunk>() };
    expect(isSeekable(plain)).toBe(false);

    const seekable = { ...plain, seek: async () => {} };
    expect(isSeekable(seekable)).toBe(true);
  });
});
