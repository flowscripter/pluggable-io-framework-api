import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { Part } from "./Part.ts";

/**
 * Writes an entry as independently uploaded parts, returned by
 * `IOProvider.getMultipartWriter`. A writer that can continue an
 * interrupted upload also implements `ResumableWritable`.
 */
export interface MultipartWriter<K extends PayloadKind = PayloadKind> {
  /** Writes every part, then commits the entry. */
  write(parts: AsyncIterable<Part<K>>): Promise<void>;
}
