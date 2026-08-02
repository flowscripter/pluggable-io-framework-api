import type { ChunkKind } from "./ChunkRef.ts";
import type { ItemProperties } from "./ItemProperties.ts";
import type { Part } from "./Part.ts";
import type { StreamHandle } from "./StreamHandle.ts";

/**
 * A configured source/sink instance, as returned by
 * {@link IOProviderFactory.createProvider}. `K` is the single
 * {@link ChunkKind} this provider natively produces/consumes - e.g. a
 * pure-TS filesystem plugin is `IOProvider<"js">`, a Rust-FFI-backed plugin
 * is `IOProvider<"native">`.
 *
 * Disposal is `Symbol.asyncDispose` (TC39 explicit resource management) -
 * host code disposes deterministically via `await using provider = ...`,
 * including on thrown errors, without needing a bespoke method name.
 */
export interface IOProvider<K extends ChunkKind = ChunkKind> {
  /** The single chunk kind this provider natively produces/consumes. */
  readonly kind: K;

  [Symbol.asyncDispose](): Promise<void>;

  list(
    path: string,
    options?: { recursive?: boolean; regex?: RegExp },
  ): AsyncIterable<{ path: string; properties: ItemProperties }>;
  getProperties(path: string): Promise<ItemProperties>;
  setProperties(path: string, properties: Partial<Record<string, unknown>>): Promise<void>;
  delete(path: string): Promise<void>;

  getReadableStream(path: string): Promise<StreamHandle<K>>;
  getWritableStream(path: string): Promise<StreamHandle<K>>;
  getMultipartReader(path: string): AsyncIterable<Part<K>>;
  getMultipartWriter(path: string): { write(parts: AsyncIterable<Part<K>>): Promise<void> };

  /**
   * Self-reported direct-transfer eligibility - the provider owns what
   * "same" means for its backend (e.g. same mount for filesystem, same
   * bucket+region+credentials for object storage).
   */
  canDirectTransfer?(other: IOProvider): boolean;
  directCopy?(sourcePath: string, destPath: string): Promise<void>;
  directMove?(sourcePath: string, destPath: string): Promise<void>;
}
