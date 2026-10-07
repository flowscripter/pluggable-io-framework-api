import type { JsonValue } from "../util/JsonValue.ts";
import type { PayloadKind } from "../item/payload/PayloadKind.ts";
import type { StreamHandle } from "../stream/StreamHandle.ts";

/**
 * Serializable state that lets an interrupted write be resumed via
 * `IOProvider.getWritableStream(path, { resume })`.
 */
export interface ResumeToken {
  /** Bytes committed (best known). */
  readonly offset: number;
  /** Provider-specific state, e.g. `{ uploadId, parts }` or `{ uploadUrl }`. */
  readonly state?: JsonValue;
}

/** Capability of a writable handle that can produce a {@link ResumeToken}. */
export interface ResumableWritable {
  /** Must still work after the handle has failed. */
  resumeToken(): ResumeToken | undefined;
}

export function isResumableWritable<K extends PayloadKind>(
  handle: StreamHandle<K>,
): handle is StreamHandle<K> & ResumableWritable {
  return typeof (handle as Partial<ResumableWritable>).resumeToken === "function";
}
