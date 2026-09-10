import type { ChunkKind } from "./ChunkRef.ts";
import type { ItemProperties } from "./ItemProperties.ts";
import type { Part } from "./Part.ts";
import type { StreamHandle } from "./StreamHandle.ts";
import type { TelemetryHooks } from "./TelemetryHooks.ts";

/**
 * Hard/preferred size bounds a provider imposes on multipart transfer parts
 * for a file of the given total size (e.g. S3 requires a minimum part size
 * and caps the total number of parts at 10000, so a very large file needs a
 * larger part size than a small one). Returned by
 * {@link IOProvider.getPartSizeConstraints}; the framework reconciles
 * source and sink bounds to pick a single negotiated part size.
 */
export interface PartSizeConstraints {
  readonly minPartSize: number;
  readonly maxPartSize: number;
  readonly maxParts: number;
  readonly defaultPartSize: number;
}

/** Correlation ID plus the hooks to report through, threaded into direct-transfer calls so a provider can surface native progress if its backend supports it. */
export interface TransferTelemetry {
  readonly operationId: string;
  readonly hooks: TelemetryHooks;
}

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

  /**
   * Creates an empty folder at `path` (idempotent - mkdir-p style). Used by
   * non-direct recursive copy/move to recreate source folders that contain
   * no files at the destination. Providers whose backend has no real
   * folder concept (e.g. flat object storage) can omit this.
   */
  createFolder?(path: string): Promise<void>;

  getReadableStream(path: string): Promise<StreamHandle<K>>;
  getWritableStream(path: string): Promise<StreamHandle<K>>;

  /**
   * Reports this provider's part-size bounds for a multipart transfer of a
   * file of `totalSize` bytes (e.g. S3's minimum part size and 10000-part
   * cap). Omit when the provider has no such constraints - the framework
   * treats a missing implementation as unconstrained.
   */
  getPartSizeConstraints?(totalSize: number): PartSizeConstraints;
  getMultipartReader(path: string, partSize: number): AsyncIterable<Part<K>>;
  getMultipartWriter(
    path: string,
    partSize: number,
  ): { write(parts: AsyncIterable<Part<K>>): Promise<void> };

  /**
   * Self-reported direct-transfer eligibility - the provider owns what
   * "same" means for its backend (e.g. same mount for filesystem, same
   * bucket+region+credentials for object storage).
   */
  canDirectTransfer?(other: IOProvider): boolean;

  /**
   * Whether {@link directCopy}/{@link directMove} accept a folder `sourcePath`
   * and recurse internally. When `false`/omitted, the framework never calls
   * `directCopy`/`directMove` with a folder path - it falls back to listing
   * the folder and transferring each entry individually (which may still use
   * `directCopy`/`directMove` per single-file entry).
   */
  readonly supportsRecursiveDirectTransfer?: boolean;
  directCopy?(sourcePath: string, destPath: string, telemetry?: TransferTelemetry): Promise<void>;
  directMove?(sourcePath: string, destPath: string, telemetry?: TransferTelemetry): Promise<void>;
}
