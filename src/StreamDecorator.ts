import { type ItemOfKind, type NativePayload, PayloadKind } from "./Item.ts";
import type { StreamHandle } from "./StreamHandle.ts";

/** Capability added by the `seekable` decorator: jump to an absolute offset. */
export interface Seekable {
  seek(offset: number): Promise<void>;
}

export function isSeekable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & Seekable {
  return typeof (handle as Partial<Seekable>).seek === "function";
}

/** Capability of a handle that can serve an arbitrary byte range directly. */
export interface RangeReadable<K extends PayloadKind = PayloadKind> {
  readRange(start: number, end: number): Promise<ReadableStream<ItemOfKind<K>>>;
}

export function isRangeReadable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & RangeReadable<K> {
  return typeof (handle as Partial<RangeReadable<K>>).readRange === "function";
}

/**
 * Placeholder capability: a cheap forward-only advance without opening a new
 * connection (e.g. for a future decompression decorator). No current
 * provider implements it.
 */
export interface Skippable {
  skip(bytes: number): Promise<void>;
}

export function isSkippable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & Skippable {
  return typeof (handle as Partial<Skippable>).skip === "function";
}

/**
 * A sink-provided buffer handed out by a {@link BufferProvider}. The source
 * fills it, then it is either committed or released.
 */
export interface BufferLease {
  readonly ptr: number;
  readonly length: number;
  readonly domain: string;
  readonly descriptor?: NativePayload["descriptor"];
  /** Commits the first `length` bytes of the buffer to the sink. */
  commit(length: number, attributes?: Readonly<Record<string, unknown>>): Promise<void>;
  /** Abandons the lease without committing. Idempotent. */
  release(): void;
}

/**
 * Capability of a writable native handle that hands out its own buffers
 * (e.g. a registered RDMA region or an aligned file buffer) for zero-copy
 * writes. Native only.
 */
export interface BufferProvider {
  readonly domain: string;
  readonly maxOutstanding?: number;
  acquire(sizeHint?: number): Promise<BufferLease>;
}

export function isBufferProvider<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & BufferProvider {
  return (
    (handle.kind as PayloadKind) === PayloadKind.Native &&
    typeof (handle as Partial<BufferProvider>).acquire === "function"
  );
}

/**
 * Capability of a readable native handle that can fill a sink-provided
 * {@link BufferLease} directly. Native only.
 */
export interface FillReadable {
  readonly domains: readonly string[];
  /** Resolves with the number of bytes written into the lease, or `null` at end of stream. */
  readInto(lease: BufferLease): Promise<number | null>;
}

export function isFillReadable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & FillReadable {
  return (
    (handle.kind as PayloadKind) === PayloadKind.Native &&
    typeof (handle as Partial<FillReadable>).readInto === "function"
  );
}

/**
 * A decorator wraps a {@link StreamHandle} and returns an enhanced handle
 * with additional capabilities `C` (e.g. {@link Seekable}). When `C` is
 * known at the call site (the common case - a specific decorator is applied
 * directly), consumers get static typing with no runtime capability check
 * needed. Where a handle arrives already decorated by unknown/dynamic
 * decorators, use the `is*` type guards above instead.
 */
export type StreamDecorator<K extends PayloadKind = PayloadKind, C extends object = object> = (
  handle: StreamHandle<K>,
) => StreamHandle<K> & C;

/**
 * A decorator that wraps the function opening a {@link StreamHandle} rather
 * than the handle itself (e.g. a local cache that decides whether to open
 * the underlying stream at all).
 */
export type StreamOpenerDecorator<
  K extends PayloadKind = PayloadKind,
  C extends object = object,
> = (open: () => Promise<StreamHandle<K>>) => () => Promise<StreamHandle<K> & C>;
