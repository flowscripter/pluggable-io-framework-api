import type { EntryProperties, EntryPropertyChanges } from "./EntryProperties.ts";
import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { Part } from "../stream/Part.ts";
import type { ResumeToken } from "../capability/ResumableWritable.ts";
import type { StreamHandle } from "../stream/StreamHandle.ts";
import type { TelemetryHooks } from "../TelemetryHooks.ts";

/**
 * Hard/preferred size bounds a provider imposes on multipart transfer parts
 * for an entry of the given total size (e.g. S3 requires a minimum part size
 * and caps the total number of parts at 10000, so a very large entry needs a
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
 * {@link PayloadKind} this provider natively produces/consumes - e.g. a
 * pure-TS filesystem plugin is `IOProvider<"js">`, a Rust-FFI-backed plugin
 * is `IOProvider<"native">`.
 *
 * Every `path` argument is the provider-specific entry or container key (as
 * produced by `IOProviderFactory.toProviderInputs`). Each method implies
 * whether it addresses an entry or a container.
 *
 * Disposal is `Symbol.asyncDispose` (TC39 explicit resource management) -
 * host code disposes deterministically via `await using provider = ...`,
 * including on thrown errors, without needing a bespoke method name.
 */
export interface IOProvider<K extends PayloadKind = PayloadKind> {
  /** The single payload kind this provider natively produces/consumes. */
  readonly kind: K;

  [Symbol.asyncDispose](): Promise<void>;

  /** Lists the entries in a container. Omitted by protocols with no container concept. */
  list?(
    path: string,
    options?: { recursive?: boolean; regex?: RegExp },
  ): AsyncIterable<{ path: string; properties: EntryProperties }>;
  getProperties(path: string): Promise<EntryProperties>;
  /** Omitted by protocols with no generic way to change entry properties. */
  setProperties?(path: string, changes: EntryPropertyChanges): Promise<void>;
  delete?(path: string): Promise<void>;

  /**
   * Creates an empty container at `path` (idempotent - mkdir-p style). Used
   * by non-direct recursive copy/move to recreate source containers that
   * hold no entries at the destination. Providers whose backend has no real
   * container concept can omit this.
   */
  createContainer?(path: string): Promise<void>;

  /**
   * Builds a child key from a container key and a child name. Omit to use
   * the framework default (`/`-join).
   */
  joinKey?(containerKey: string, name: string): string;

  getReadableStream(path: string): Promise<StreamHandle<K>>;

  /**
   * Opens a writable stream. With `resume`, the provider re-checks what was
   * actually committed and continues from there, reporting the real resume
   * position as `startOffset` (bytes).
   */
  getWritableStream(
    path: string,
    opts?: { resume?: ResumeToken },
  ): Promise<StreamHandle<K> & { readonly startOffset?: number }>;

  /**
   * Reports this provider's part-size bounds for a multipart transfer of an
   * entry of `totalSize` bytes (e.g. S3's minimum part size and 10000-part
   * cap). Omit when the provider has no such constraints - the framework
   * treats a missing implementation as unconstrained.
   */
  getPartSizeConstraints?(totalSize: number): PartSizeConstraints;

  /**
   * Provider-specific multipart upload (e.g. S3's multipart protocol). The
   * read side needs no equivalent: any readable handle implementing
   * `RangeReadable` can be read in parts.
   */
  getMultipartWriter?(
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
   * Whether {@link directCopy}/{@link directMove} accept a container
   * `sourcePath` and recurse internally. When `false`/omitted, the framework
   * never calls `directCopy`/`directMove` with a container path - it falls
   * back to listing the container and transferring each entry individually
   * (which may still use `directCopy`/`directMove` per entry).
   */
  readonly supportsRecursiveDirectTransfer?: boolean;
  directCopy?(sourcePath: string, destPath: string, telemetry?: TransferTelemetry): Promise<void>;
  directMove?(sourcePath: string, destPath: string, telemetry?: TransferTelemetry): Promise<void>;
}
