import { describe, expect, test } from "bun:test";
import { PayloadKind, fromWebReadableStream, toWebReadableStream } from "../../index.ts";

describe("Web Streams interop adapters", () => {
  test("fromWebReadableStream then toWebReadableStream round-trips bytes", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("abc"));
        controller.close();
      },
    });
    const items = fromWebReadableStream(source);
    const webStream = toWebReadableStream(items);
    const reader = webStream.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe("abc");
    expect((await reader.read()).done).toBe(true);
  });

  test("fromWebReadableStream wraps bytes as js payload items", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1]));
        controller.close();
      },
    });
    const { value } = await fromWebReadableStream(source).getReader().read();
    expect(value).toEqual({ payload: { kind: PayloadKind.Js, data: new Uint8Array([1]) } });
  });
});
