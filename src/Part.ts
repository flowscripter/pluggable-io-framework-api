import type { ItemOfKind } from "./Item.ts";
import type { PayloadKind } from "./payload/PayloadKind.ts";

/**
 * One independently readable/writable part of a multipart transfer, carrying
 * a homogeneous stream of a single declared {@link PayloadKind}. Parts may be
 * processed concurrently (e.g. `Promise.all` over N parts); the provider
 * assembles/commits them once all parts finish.
 */
export interface Part<K extends PayloadKind = PayloadKind> {
  readonly index: number;
  readonly offset: number;
  readonly kind: K;
  readonly stream: ReadableStream<ItemOfKind<K>> | WritableStream<ItemOfKind<K>>;
  complete(): Promise<void>;
}
