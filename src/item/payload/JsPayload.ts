import type { PayloadKind } from "./PayloadKind.ts";

/** A payload that lives in a normal JS-managed Uint8Array. */
export interface JsPayload {
  readonly kind: PayloadKind.Js;
  readonly data: Uint8Array;
}
