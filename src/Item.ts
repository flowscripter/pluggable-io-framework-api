import type { PayloadKind } from "./payload/PayloadKind.ts";
import type { PayloadOfKind } from "./payload/PayloadOfKind.ts";

/**
 * Opaque item attributes. `discontinuity` is the one reserved framework key:
 * set by the engine on the first item after an unbounded source reconnects.
 */
export type ItemAttributes = Readonly<{ discontinuity?: boolean } & Record<string, unknown>>;

/**
 * The unit carried by a stream: optional attributes plus a payload
 * tagged with its memory origin/ownership. The payload type is not repeated
 * per item - it lives on `StreamHandle.payloadType`.
 */
export interface Item<K extends PayloadKind = PayloadKind> {
  readonly attributes?: ItemAttributes;
  readonly payload: PayloadOfKind<K>;
}

/** The concrete item type produced by a stream tagged with a given kind. */
export type ItemOfKind<K extends PayloadKind> = Item<K>;
