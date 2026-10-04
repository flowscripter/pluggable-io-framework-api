import { describe, expect, test } from "bun:test";
import {
  HOST_DOMAIN,
  PayloadKind,
  isBufferProvider,
  isFillReadable,
  type BufferLease,
  type BufferProvider,
  type FillReadable,
  type Item,
  type StreamHandle,
} from "../../index.ts";

const jsHandle: StreamHandle<PayloadKind.Js> = {
  kind: PayloadKind.Js,
  stream: new ReadableStream<Item<PayloadKind.Js>>(),
};

const nativeHandle: StreamHandle<PayloadKind.Native> = {
  kind: PayloadKind.Native,
  stream: new ReadableStream<Item<PayloadKind.Native>>(),
};

function createLease(log: string[]): BufferLease {
  return {
    ptr: 0,
    length: 16,
    domain: HOST_DOMAIN,
    async commit(length) {
      log.push(`commit:${length}`);
    },
    release() {
      log.push("release");
    },
  };
}

describe("isBufferProvider", () => {
  const provider: BufferProvider = {
    domain: HOST_DOMAIN,
    maxOutstanding: 2,
    acquire: async () => createLease([]),
  };

  test("returns true for a native handle with acquire", () => {
    expect(isBufferProvider(nativeHandle)).toBe(false);
    expect(isBufferProvider({ ...nativeHandle, ...provider })).toBe(true);
  });

  test("returns false for a js handle even with acquire (native only)", () => {
    expect(isBufferProvider({ ...jsHandle, ...provider })).toBe(false);
  });

  test("lease acquire, fill and commit round trip", async () => {
    const log: string[] = [];
    const sink = { ...nativeHandle, domain: HOST_DOMAIN, acquire: async () => createLease(log) };
    const fill: FillReadable = {
      domains: [HOST_DOMAIN],
      async readInto(lease) {
        return lease.length / 2;
      },
    };
    const source = { ...nativeHandle, ...fill };
    if (!isBufferProvider(sink) || !isFillReadable(source)) {
      throw new Error("expected lease capabilities");
    }
    expect(source.domains.includes(sink.domain)).toBe(true);
    const lease = await sink.acquire(16);
    const written = await source.readInto(lease);
    expect(written).toBe(8);
    await lease.commit(written ?? 0);
    lease.release();
    expect(log).toEqual(["commit:8", "release"]);
  });
});
