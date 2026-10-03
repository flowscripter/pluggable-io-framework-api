import { describe, expect, test } from "bun:test";
import {
  PayloadKind,
  type Item,
  type StreamHandle,
  type StreamOpenerDecorator,
} from "../../index.ts";

const jsHandle: StreamHandle<PayloadKind.Js> = {
  kind: PayloadKind.Js,
  stream: new ReadableStream<Item<PayloadKind.Js>>(),
};

describe("StreamOpenerDecorator", () => {
  test("wraps the opener and adds a capability", async () => {
    let opens = 0;
    const counted: StreamOpenerDecorator<PayloadKind.Js, { readonly cached: boolean }> =
      (open) => async () => {
        opens += 1;
        return { ...(await open()), cached: opens > 1 };
      };
    const open = counted(async () => jsHandle);
    expect((await open()).cached).toBe(false);
    expect((await open()).cached).toBe(true);
  });
});
