import { describe, expect, test } from "bun:test";
import {
  HOST_DOMAIN,
  PayloadKind,
  isBufferProvider,
  isFillReadable,
  isRangeReadable,
  isSeekable,
  isSkippable,
  type BufferLease,
  type BufferProvider,
  type FillReadable,
  type Item,
  type StreamHandle,
  type StreamOpenerDecorator,
} from "../index.ts";

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

describe("isSeekable", () => {
  test("returns false for a plain handle and true once decorated", () => {
    expect(isSeekable(jsHandle)).toBe(false);
    const seekable = { ...jsHandle, seek: async () => {} };
    expect(isSeekable(seekable)).toBe(true);
  });
});

describe("isRangeReadable", () => {
  test("returns false for a plain handle and true when readRange is present", () => {
    expect(isRangeReadable(jsHandle)).toBe(false);
    const ranged = {
      ...jsHandle,
      readRange: async () => new ReadableStream<Item<PayloadKind.Js>>(),
    };
    expect(isRangeReadable(ranged)).toBe(true);
  });
});

describe("isSkippable", () => {
  test("returns false for a plain handle and true when skip is present", () => {
    expect(isSkippable(jsHandle)).toBe(false);
    const skippable = { ...jsHandle, skip: async () => {} };
    expect(isSkippable(skippable)).toBe(true);
  });
});

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

describe("isFillReadable", () => {
  const fill: FillReadable = { domains: [HOST_DOMAIN], readInto: async () => null };

  test("returns true for a native handle with readInto", () => {
    expect(isFillReadable(nativeHandle)).toBe(false);
    expect(isFillReadable({ ...nativeHandle, ...fill })).toBe(true);
  });

  test("returns false for a js handle even with readInto (native only)", () => {
    expect(isFillReadable({ ...jsHandle, ...fill })).toBe(false);
  });
});

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
