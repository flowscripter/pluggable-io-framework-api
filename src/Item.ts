/**
 * The two possible payload memory origins.
 */
export enum PayloadKind {
  Js = "js",
  Native = "native",
}

/** A payload that lives in a normal JS-managed Uint8Array. */
export interface JsPayload {
  readonly kind: PayloadKind.Js;
  readonly data: Uint8Array;
}

/**
 * A payload that lives in memory owned outside the JS heap (e.g. a
 * Rust-allocated buffer). `release()` must be called once nothing needs the
 * buffer - ownership/lifetime is explicit rather than GC'd, since JS code
 * cannot safely retain a raw pointer past the point its owner frees it.
 */
export interface NativePayload {
  readonly kind: PayloadKind.Native;
  /**
   * The memory domain, i.e. who can dereference `ptr`: `"host"` (the default)
   * means any CPU code in the process; a device domain such as `"cuda:0"`
   * means only that device's code. Memory registration (e.g. RDMA) is not a
   * domain - see `descriptor.registrations`.
   */
  readonly domain: string;
  readonly ptr: number;
  readonly length: number;
  /**
   * Per-consumer annotations. `registrations` holds memory registrations
   * keyed by the registrar's id (e.g. `"fabric:verbs;mlx5_0"`).
   */
  readonly descriptor?: { readonly registrations?: Readonly<Record<string, unknown>> };
  release(): void;
}

/** The default {@link NativePayload.domain}: memory addressable by any CPU code in the process. */
export const HOST_DOMAIN = "host";

/** Maps each {@link PayloadKind} to its payload type. */
export interface PayloadByKind {
  [PayloadKind.Js]: JsPayload;
  [PayloadKind.Native]: NativePayload;
}

/**
 * The concrete payload type for a given kind (equivalent to
 * `Extract<JsPayload | NativePayload, { kind: K }>`, but covariant in `K` so
 * `Item<PayloadKind.Js>` is assignable to `Item`).
 */
export type PayloadOfKind<K extends PayloadKind> = PayloadByKind[K];

/**
 * Opaque item attributes. `discontinuity` is the one reserved framework key:
 * set by the engine on the first item after an unbounded source reconnects.
 */
export type ItemAttributes = Readonly<{ discontinuity?: boolean } & Record<string, unknown>>;

/**
 * The unit passed over a stream link: optional attributes plus a payload
 * tagged with its memory origin/ownership. The payload type is not repeated
 * per item - it lives on `StreamHandle.payloadType`.
 */
export interface Item<K extends PayloadKind = PayloadKind> {
  readonly attributes?: ItemAttributes;
  readonly payload: PayloadOfKind<K>;
}

/** The concrete item type produced by a stream tagged with a given kind. */
export type ItemOfKind<K extends PayloadKind> = Item<K>;

/**
 * Converts a single item to the target payload kind. Pure-TS code can only
 * ever implement the identity case (same kind in, same kind out) - a real
 * js<->native conversion needs FFI-capable pointer access and must be
 * supplied by a runtime-specific package (e.g. via `bun:ffi`).
 */
export type PayloadConverter = (item: Item, toKind: PayloadKind) => Item;

/** Identity converter - only handles items whose payload is already of the requested kind. */
export const identityPayloadConverter: PayloadConverter = (item, toKind) => {
  if (item.payload.kind === toKind) {
    return item;
  }
  throw new Error(
    `Cannot convert a "${item.payload.kind}" payload to "${toKind}" without an FFI-capable PayloadConverter`,
  );
};

/**
 * Extension point constant that a `dynamic-plugin-framework` `Plugin`'s
 * `ExtensionDescriptor.extensionPoint` must match to be discovered as a
 * {@link PayloadConverterExtension}.
 */
export const PLUGGABLE_IO_FRAMEWORK_PAYLOAD_CONVERTER_EXTENSION_POINT =
  "@flowscripter/pluggable-io-framework/payload-converter";

/**
 * A payload converter registered as a plugin extension. The registry uses
 * converters during negotiation when source and sink share no common
 * (kind, domain).
 */
export interface PayloadConverterExtension {
  readonly from: { readonly kind: PayloadKind; readonly domain?: string };
  readonly to: { readonly kind: PayloadKind; readonly domain?: string };
  /** `0` = zero-copy, `1` = copies. */
  readonly cost: 0 | 1;
  convert(item: Item): Item;
}

/**
 * Adapts a homogeneous stream of one kind to another, using `convert`. When
 * `fromKind === toKind` the stream is passed straight through untouched (no
 * per-item work at all). This is the ONE place a kind mismatch is decided -
 * once per stream link, not once per item.
 */
export function adaptReadableStream<From extends PayloadKind, To extends PayloadKind>(
  stream: ReadableStream<ItemOfKind<From>>,
  fromKind: From,
  toKind: To,
  convert: PayloadConverter = identityPayloadConverter,
): ReadableStream<ItemOfKind<To>> {
  if ((fromKind as PayloadKind) === (toKind as PayloadKind)) {
    return stream as unknown as ReadableStream<ItemOfKind<To>>;
  }
  const reader = stream.getReader();
  return new ReadableStream<ItemOfKind<To>>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(convert(value, toKind) as ItemOfKind<To>);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/**
 * Adapter to the standard Web Streams interop surface (fetch, pipeTo
 * external consumers). This is the one clearly-marked copy boundary -
 * internal source/sink/decorator code speaks {@link Item} directly. Item
 * attributes are dropped.
 */
export function toWebReadableStream(
  source: ReadableStream<Item<PayloadKind.Js>>,
): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      // value is statically a js item here - no per-item kind check needed.
      controller.enqueue(value.payload.data);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

export function fromWebReadableStream(
  source: ReadableStream<Uint8Array>,
): ReadableStream<Item<PayloadKind.Js>> {
  const reader = source.getReader();
  return new ReadableStream<Item<PayloadKind.Js>>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue({ payload: { kind: PayloadKind.Js, data: value } });
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
