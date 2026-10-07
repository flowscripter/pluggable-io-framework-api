import { describe, expect, test } from "bun:test";
import {
  type Item,
  type MultipartWriter,
  type Part,
  PayloadKind,
  type ResumableWritable,
  type ResumeToken,
} from "../../index.ts";

function part(index: number, text: string): Part<PayloadKind.Js> {
  return {
    index,
    offset: index * 2,
    kind: PayloadKind.Js,
    stream: new ReadableStream<Item<PayloadKind.Js>>({
      start(controller) {
        controller.enqueue({
          payload: { kind: PayloadKind.Js, data: new TextEncoder().encode(text) },
        });
        controller.close();
      },
    }),
    complete: async () => {},
  };
}

function makeWriter(
  committed: Map<number, string>,
  resume?: ResumeToken,
): MultipartWriter<PayloadKind.Js> & ResumableWritable {
  const known = new Set((resume?.state as number[] | undefined) ?? []);
  return {
    async write(parts) {
      for await (const next of parts) {
        const reader = (next.stream as ReadableStream<Item<PayloadKind.Js>>).getReader();
        const { value } = await reader.read();
        if (!known.has(next.index)) {
          committed.set(next.index, new TextDecoder().decode(value?.payload.data));
          known.add(next.index);
        }
        await next.complete();
      }
    },
    resumeToken() {
      return { offset: committed.size * 2, state: [...known] };
    },
  };
}

describe("MultipartWriter contract", () => {
  test("a resumed writer skips the parts its token records as committed", async () => {
    const committed = new Map<number, string>();
    const first = makeWriter(committed);
    await first.write(
      (async function* () {
        yield part(0, "ab");
      })(),
    );
    const token = first.resumeToken();
    expect(token?.offset).toBe(2);

    const resumed = makeWriter(committed, token);
    await resumed.write(
      (async function* () {
        yield part(0, "xx");
        yield part(1, "cd");
      })(),
    );
    expect([...committed.entries()]).toEqual([
      [0, "ab"],
      [1, "cd"],
    ]);
  });
});
