import type { JsPayload } from "./JsPayload.ts";
import type { NativePayload } from "./NativePayload.ts";
import type { PayloadKind } from "./PayloadKind.ts";

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
