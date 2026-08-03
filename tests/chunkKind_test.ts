import { describe, expect, test } from "bun:test";
import {
  ChunkKind,
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
    const adapted = adaptReadableStream(original, ChunkKind.Js, ChunkKind.Js);
    expect(adapted).toBe(original);
  });

  test("converts each chunk once when kinds differ, using the supplied converter", async () => {
    const source = new ReadableStream<JsChunk>({
      start(controller) {
        controller.enqueue({ kind: ChunkKind.Js, data: new TextEncoder().encode("hi") });
        controller.close();
      },
    });
    let conversions = 0;
    const convert: ChunkConverter = (chunk, toKind) => {
      conversions += 1;
      if (chunk.kind === ChunkKind.Js && toKind === ChunkKind.Native) {
        return {
          kind: ChunkKind.Native,
          ptr: 0,
          length: chunk.data.byteLength,
          release: () => {},
        } as NativeChunk;
      }
      throw new Error("unexpected conversion in test");
    };

    const adapted = adaptReadableStream(source, ChunkKind.Js, ChunkKind.Native, convert);
    const reader = adapted.getReader();
    const { value } = await reader.read();
    expect(value?.kind).toBe(ChunkKind.Native);
    expect(conversions).toBe(1);
  });
});

describe("isSeekable", () => {
  test("returns false for a plain handle and true once decorated", () => {
    const plain: StreamHandle<ChunkKind.Js> = {
      kind: ChunkKind.Js,
      stream: new ReadableStream<JsChunk>(),
    };
    expect(isSeekable(plain)).toBe(false);

    const seekable = { ...plain, seek: async () => {} };
    expect(isSeekable(seekable)).toBe(true);
  });
});
